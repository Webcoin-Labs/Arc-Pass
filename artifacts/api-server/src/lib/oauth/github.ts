import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";

export function isGithubOAuthConfigured(): boolean {
  return readProviderEnv("GITHUB") !== null;
}

export function buildGithubAuthorizeUrl(state: string): string {
  const config = readProviderEnv("GITHUB");
  if (!config) throw new Error("GitHub OAuth is not configured");

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeGithubCode(code: string): Promise<OAuthProfile> {
  const config = readProviderEnv("GITHUB");
  if (!config) throw new Error("GitHub OAuth is not configured");

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
  }

  const { access_token: accessToken } = (await tokenResponse.json()) as { access_token: string };

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "arc-pass" },
  });

  if (!profileResponse.ok) {
    throw new Error(`GitHub profile fetch failed: ${profileResponse.status}`);
  }

  const profile = (await profileResponse.json()) as { id: number; login: string; name?: string; avatar_url?: string };

  return {
    providerUserId: String(profile.id),
    username: profile.login,
    displayName: profile.name ?? profile.login,
    avatarUrl: profile.avatar_url ?? null,
  };
}
