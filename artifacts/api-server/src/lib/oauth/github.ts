import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";

export function isGithubOAuthConfigured(): boolean {
  return readProviderEnv("GITHUB") !== null;
}

export function buildGithubAuthorizeUrl(state: string, codeChallenge: string): string {
  const config = readProviderEnv("GITHUB");
  if (!config) throw new Error("GitHub OAuth is not configured");

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  // read:user includes the user's contribution calendar, including private
  // contributions when the account has opted into showing them.
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  return url.toString();
}

async function exchangeGithubCodeInternal(code: string, codeVerifier: string): Promise<{ profile: OAuthProfile; accessToken: string; accountCreatedAt: Date }> {
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
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token exchange failed: ${tokenResponse.status}`);
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error?: string };
  if (!tokenPayload.access_token) {
    throw new Error(`GitHub token exchange failed: ${tokenPayload.error ?? "missing_access_token"}`);
  }
  const accessToken = tokenPayload.access_token;

  const profileResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "arc-pass" },
  });

  if (!profileResponse.ok) {
    throw new Error(`GitHub profile fetch failed: ${profileResponse.status}`);
  }

  const profile = (await profileResponse.json()) as { id: number; login: string; name?: string; avatar_url?: string; created_at?: string };
  const accountCreatedAt = profile.created_at ? new Date(profile.created_at) : null;
  if (!accountCreatedAt || Number.isNaN(accountCreatedAt.getTime())) throw new Error("GitHub profile did not include a valid account creation date");

  return {
    accessToken,
    accountCreatedAt,
    profile: {
      providerUserId: String(profile.id),
      username: profile.login,
      displayName: profile.name ?? profile.login,
      avatarUrl: profile.avatar_url ?? null,
    },
  };
}

/**
 * Returns the account profile while keeping the access token private to the
 * server. Callers should not persist or expose the token.
 */
export async function exchangeGithubCode(code: string, codeVerifier: string): Promise<OAuthProfile> {
  return (await exchangeGithubCodeInternal(code, codeVerifier)).profile;
}

/** Exchanges OAuth and snapshots the authenticated user's real contribution count. */
export async function exchangeGithubCodeWithContributions(code: string, codeVerifier: string): Promise<{ profile: OAuthProfile; contributionCount: number | null; accountCreatedAt: Date; contributionWindowStartedAt: Date }> {
  const { profile, accessToken, accountCreatedAt } = await exchangeGithubCodeInternal(code, codeVerifier);
  const contributionWindowStartedAt = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  return { profile, accountCreatedAt, contributionWindowStartedAt, contributionCount: await fetchGithubContributionCount(accessToken, contributionWindowStartedAt, new Date()) };
}

/**
 * GitHub's REST events are not a contribution total. Use the GraphQL
 * contribution calendar so commits, issues, pull requests and reviews are
 * counted by GitHub itself. A temporary provider failure returns null rather
 * than fabricating a value or blocking identity linking.
 */
export async function fetchGithubContributionCount(accessToken: string, from = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), to = new Date()): Promise<number | null> {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "arc-pass",
    },
    body: JSON.stringify({
      query: "query ArcPassContributions($from: DateTime!, $to: DateTime!) { viewer { contributionsCollection(from: $from, to: $to) { contributionCalendar { totalContributions } } } }",
      variables: { from: from.toISOString(), to: to.toISOString() },
    }),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as {
    data?: { viewer?: { contributionsCollection?: { contributionCalendar?: { totalContributions?: number } } } };
    errors?: unknown[];
  };
  const count = payload.data?.viewer?.contributionsCollection?.contributionCalendar?.totalContributions;
  return payload.errors?.length || !Number.isSafeInteger(count) ? null : count ?? null;
}
