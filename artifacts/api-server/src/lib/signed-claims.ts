import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { db, mintAuthorizationsTable } from "@workspace/db";
import { and, eq, isNull } from "drizzle-orm";
import { MINT_AUTHORIZATION_TTL_MINUTES } from "./tier-config";

// Falls back to an ephemeral key when MINT_SIGNING_KEY isn't set so local
// dev still works, but authorizations won't survive a server restart —
// production must set a persistent MINT_SIGNING_KEY (32+ random bytes,
// base64) or every issued ticket invalidates on deploy.
const signingSecret = process.env.MINT_SIGNING_KEY
  ? Buffer.from(process.env.MINT_SIGNING_KEY, "base64")
  : randomBytes(32);

export type PassType = "founder" | "builder";
export type ClaimAction = "mint" | "upgrade";

export interface MintAuthorizationTicket {
  ticket: string;
  nonce: string;
  expiresAt: Date;
}

/**
 * Issues a short-lived, single-use authorization for a mint or tier-upgrade
 * action. The nonce is recorded in `mint_authorizations` up front so
 * `consumeMintAuthorization` can atomically reject replay even if the same
 * ticket is submitted twice concurrently.
 */
export async function createMintAuthorization(params: {
  passType: PassType;
  passId: number;
  action: ClaimAction;
  destinationWallet: string;
}): Promise<MintAuthorizationTicket> {
  const nonce = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + MINT_AUTHORIZATION_TTL_MINUTES * 60_000);

  await db.insert(mintAuthorizationsTable).values({
    nonce,
    passType: params.passType,
    passId: params.passId,
    action: params.action,
    destinationWallet: params.destinationWallet,
    expiresAt,
  });

  const ticket = await new SignJWT({
    passType: params.passType,
    passId: params.passId,
    action: params.action,
    destinationWallet: params.destinationWallet,
    nonce,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(signingSecret);

  return { ticket, nonce, expiresAt };
}

export interface ConsumedAuthorization {
  passType: PassType;
  passId: number;
  action: ClaimAction;
  destinationWallet: string;
  nonce: string;
}

/** Verifies signature + expiry, then atomically marks the nonce consumed. Throws on replay. */
export async function consumeMintAuthorization(ticket: string): Promise<ConsumedAuthorization> {
  const { payload } = await jwtVerify(ticket, signingSecret);
  const nonce = payload.nonce as string;

  const [record] = await db.select().from(mintAuthorizationsTable).where(eq(mintAuthorizationsTable.nonce, nonce));
  if (!record) throw new Error("Unknown authorization");
  if (record.consumedAt) throw new Error("Authorization already used");
  if (record.expiresAt < new Date()) throw new Error("Authorization expired");

  // The WHERE clause requires consumedAt still be NULL, so under concurrent
  // requests only one UPDATE can ever affect a row — the loser's `updated`
  // comes back empty rather than both believing they won.
  const [updated] = await db
    .update(mintAuthorizationsTable)
    .set({ consumedAt: new Date() })
    .where(and(eq(mintAuthorizationsTable.nonce, nonce), isNull(mintAuthorizationsTable.consumedAt)))
    .returning();

  if (!updated) throw new Error("Authorization already used");

  return {
    passType: payload.passType as PassType,
    passId: payload.passId as number,
    action: payload.action as ClaimAction,
    destinationWallet: payload.destinationWallet as string,
    nonce,
  };
}
