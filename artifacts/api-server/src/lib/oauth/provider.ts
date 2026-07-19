import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import type { OAuthIntent, OAuthState } from "./types";
import { db, oauthStatesTable } from "@workspace/db";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { ExpectedOAuthIdentity } from "./routing";

// Ephemeral fallback so local dev works without a persistent secret — see
// the same tradeoff noted in signed-claims.ts (production must set
// OAUTH_STATE_SIGNING_KEY or in-flight redirects break across a restart).
const stateSecret = process.env.OAUTH_STATE_SIGNING_KEY
  ? Buffer.from(process.env.OAUTH_STATE_SIGNING_KEY, "base64")
  : randomBytes(32);

const STATE_TTL_MINUTES = 10;

export async function signOAuthState(params: { intent: OAuthIntent; linkUserId?: number; returnTo: string; codeVerifier?: string; shareDraftId?: string; expectedIdentity?: ExpectedOAuthIdentity | null }): Promise<string> {
  const nonce = randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + STATE_TTL_MINUTES * 60_000);
  const payload: OAuthState = {
    intent: params.intent,
    linkUserId: params.linkUserId,
    returnTo: params.returnTo,
    shareDraftId: params.shareDraftId,
    expectedIdentity: params.expectedIdentity ?? undefined,
    nonce,
  };
  await db.insert(oauthStatesTable).values({ nonceHash: createHash("sha256").update(nonce).digest("hex"), codeVerifier: params.codeVerifier, expiresAt });
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STATE_TTL_MINUTES}m`)
    .sign(stateSecret);
}

export async function verifyOAuthState(state: string): Promise<OAuthState> {
  const { payload } = await jwtVerify(state, stateSecret);
  const parsed = payload as unknown as OAuthState;
  if (!parsed.nonce) throw new Error("OAuth state nonce missing");
  const [consumed] = await db.update(oauthStatesTable).set({ consumedAt: new Date() }).where(and(
    eq(oauthStatesTable.nonceHash, createHash("sha256").update(parsed.nonce).digest("hex")),
    isNull(oauthStatesTable.consumedAt),
    gt(oauthStatesTable.expiresAt, new Date()),
  )).returning();
  if (!consumed) throw new Error("OAuth state expired or already used");
  return { ...parsed, codeVerifier: consumed.codeVerifier ?? parsed.codeVerifier };
}

/** PKCE code_verifier/code_challenge pair (S256), required by X's OAuth 2.0. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export interface OAuthProviderEnvConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function readProviderEnv(prefix: "X" | "DISCORD" | "GITHUB"): OAuthProviderEnvConfig | null {
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  const redirectUri = process.env[`${prefix}_REDIRECT_URI`];
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}
