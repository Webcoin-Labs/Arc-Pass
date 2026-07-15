import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_PROFILE_URL = "https://api.x.com/2/users/me?user.fields=profile_image_url";

export function isXOAuthConfigured(): boolean {
  return readProviderEnv("X") !== null;
}

/** `state` must already have been signed with the matching PKCE `codeVerifier` embedded (see provider.ts). */
export function buildXAuthorizeUrl(state: string, codeChallenge: string): string {
  const config = readProviderEnv("X");
  if (!config) throw new Error("X OAuth is not configured");

  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "tweet.read users.read");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

export async function exchangeXCode(code: string, codeVerifier: string): Promise<OAuthProfile> {
  const config = readProviderEnv("X");
  if (!config) throw new Error("X OAuth is not configured");

  const tokenResponse = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`X token exchange failed: ${tokenResponse.status}`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch(X_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error(`X profile fetch failed: ${profileResponse.status}`);
  }

  const { data } = (await profileResponse.json()) as {
    data: { id: string; username: string; name: string; profile_image_url?: string };
  };

  return {
    providerUserId: data.id,
    username: data.username,
    displayName: data.name,
    avatarUrl: data.profile_image_url?.replace("_normal", "_400x400") ?? null,
  };
}
