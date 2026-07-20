import { readProviderEnv } from "./provider";
import type { OAuthProfile } from "./types";
import { GITHUB_CONTRIBUTION_WINDOW_DAYS } from "../builder-tier-policy";

export type GithubOAuthErrorCode = "github_token" | "github_profile" | "github_contributions" | "github_timeout";

export class GithubOAuthError extends Error {
  constructor(public readonly code: GithubOAuthErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GithubOAuthError";
  }
}

export function getGithubOAuthErrorCode(error: unknown): GithubOAuthErrorCode | null {
  return error instanceof GithubOAuthError ? error.code : null;
}

async function githubFetch(url: string, init: RequestInit, errorCode: Exclude<GithubOAuthErrorCode, "github_timeout">): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(12_000) });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new GithubOAuthError("github_timeout", "GitHub did not respond before the verification timeout", { cause: error });
    }
    throw new GithubOAuthError(errorCode, `GitHub request failed during ${errorCode.replace("github_", "")}`, { cause: error });
  }
}

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

  const tokenResponse = await githubFetch("https://github.com/login/oauth/access_token", {
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
  }, "github_token");

  if (!tokenResponse.ok) {
    throw new GithubOAuthError("github_token", `GitHub token exchange failed: ${tokenResponse.status}`);
  }

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!tokenPayload.access_token) {
    throw new GithubOAuthError("github_token", `GitHub token exchange failed: ${tokenPayload.error_description ?? tokenPayload.error ?? "missing_access_token"}`);
  }
  const accessToken = tokenPayload.access_token;

  const profileResponse = await githubFetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "arc-pass",
    },
  }, "github_profile");

  if (!profileResponse.ok) {
    throw new GithubOAuthError("github_profile", `GitHub profile fetch failed: ${profileResponse.status}`);
  }

  const profile = (await profileResponse.json()) as { id: number; login: string; name?: string; avatar_url?: string; created_at?: string };
  const accountCreatedAt = profile.created_at ? new Date(profile.created_at) : null;
  if (!accountCreatedAt || Number.isNaN(accountCreatedAt.getTime())) throw new GithubOAuthError("github_profile", "GitHub profile did not include a valid account creation date");

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
export async function exchangeGithubCodeWithContributions(code: string, codeVerifier: string): Promise<{ profile: OAuthProfile; contributionCount: number; accountCreatedAt: Date; contributionWindowStartedAt: Date }> {
  const { profile, accessToken, accountCreatedAt } = await exchangeGithubCodeInternal(code, codeVerifier);
  const contributionWindowStartedAt = new Date(Date.now() - GITHUB_CONTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return { profile, accountCreatedAt, contributionWindowStartedAt, contributionCount: await fetchGithubContributionCount(accessToken, contributionWindowStartedAt, new Date()) };
}

/**
 * GitHub's REST events are not a contribution total. Use the GraphQL
 * contribution calendar so commits, issues, pull requests and reviews are
 * counted by GitHub itself. A temporary provider failure aborts the link so
 * the application never persists a partially verified GitHub identity.
 */
export async function fetchGithubContributionCount(accessToken: string, from = new Date(Date.now() - GITHUB_CONTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000), to = new Date()): Promise<number> {
  const response = await githubFetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "arc-pass",
    },
    body: JSON.stringify({
      query: "query ArcPassContributions($from: DateTime!, $to: DateTime!) { viewer { contributionsCollection(from: $from, to: $to) { contributionCalendar { totalContributions } } } }",
      variables: { from: from.toISOString(), to: to.toISOString() },
    }),
  }, "github_contributions");

  if (!response.ok) throw new GithubOAuthError("github_contributions", `GitHub contribution fetch failed: ${response.status}`);
  const payload = (await response.json()) as {
    data?: { viewer?: { contributionsCollection?: { contributionCalendar?: { totalContributions?: number } } } };
    errors?: unknown[];
  };
  const count = payload.data?.viewer?.contributionsCollection?.contributionCalendar?.totalContributions;
  if (payload.errors?.length || !Number.isSafeInteger(count)) {
    throw new GithubOAuthError("github_contributions", "GitHub did not return a valid contribution total");
  }
  return count as number;
}
