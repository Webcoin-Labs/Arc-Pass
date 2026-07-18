import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/arc_pass_test";
process.env.GITHUB_CLIENT_ID = "github-client-id";
process.env.GITHUB_CLIENT_SECRET = "github-client-secret";
process.env.GITHUB_REDIRECT_URI = "http://localhost:8080/api/auth/github/callback";

test("GitHub linking requests minimal profile access with PKCE", async () => {
  const { buildGithubAuthorizeUrl } = await import("./oauth/github");
  const url = new URL(buildGithubAuthorizeUrl("signed-state", "pkce-challenge"));

  assert.equal(url.origin, "https://github.com");
  assert.equal(url.pathname, "/login/oauth/authorize");
  assert.equal(url.searchParams.get("scope"), "read:user");
  assert.equal(url.searchParams.get("code_challenge"), "pkce-challenge");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});

test("GitHub code exchange verifies the account with the user access token", async (t) => {
  const { exchangeGithubCode } = await import("./oauth/github");
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/login/oauth/access_token")) return Response.json({ access_token: "github-user-token" });
    return Response.json({ id: 42, login: "arc-builder", name: "Arc Builder", avatar_url: "https://avatars.githubusercontent.com/u/42", created_at: "2020-01-01T00:00:00Z" });
  }) as typeof fetch;

  const profile = await exchangeGithubCode("authorization-code", "pkce-verifier");
  const tokenBody = new URLSearchParams(String(calls[0]?.init?.body));

  assert.equal(tokenBody.get("code_verifier"), "pkce-verifier");
  assert.equal(calls[1]?.url, "https://api.github.com/user");
  assert.equal(new Headers(calls[1]?.init?.headers).get("Authorization"), "Bearer github-user-token");
  assert.deepEqual(profile, {
    providerUserId: "42",
    username: "arc-builder",
    displayName: "Arc Builder",
    avatarUrl: "https://avatars.githubusercontent.com/u/42",
  });
});

test("GitHub contribution snapshot uses the authenticated contribution calendar", async (t) => {
  const { exchangeGithubCodeWithContributions } = await import("./oauth/github");
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });

  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.endsWith("/login/oauth/access_token")) return Response.json({ access_token: "github-user-token" });
    if (url.endsWith("/user")) return Response.json({ id: 42, login: "arc-builder", name: "Arc Builder", avatar_url: null, created_at: "2020-01-01T00:00:00Z" });
    return Response.json({ data: { viewer: { contributionsCollection: { contributionCalendar: { totalContributions: 137 } } } } });
  }) as typeof fetch;

  const result = await exchangeGithubCodeWithContributions("authorization-code", "pkce-verifier");
  assert.equal(result.contributionCount, 137);
  assert.equal(result.accountCreatedAt.toISOString(), "2020-01-01T00:00:00.000Z");
  assert.equal(calls.at(-1), "https://api.github.com/graphql");
});

test("claim identity requires an ownership-verified GitHub link", async () => {
  const { hasVerifiedGithub } = await import("./auth");
  assert.equal(hasVerifiedGithub({ githubUserId: null }), false);
  assert.equal(hasVerifiedGithub({ githubUserId: "42" }), true);
});

test("Builder GitHub thresholds enforce the exact 180-day age and 10-contribution boundaries", async () => {
  const { getGithubEligibilityFailure } = await import("./auth");
  const now = new Date("2026-07-18T00:00:00Z");
  const base = { githubUserId: "42", githubAccountCreatedAt: new Date("2026-01-19T00:00:00Z"), githubContributionCount: 10, githubContributionWindowStartedAt: new Date("2026-01-19T00:00:00Z"), githubContributionsUpdatedAt: now };
  assert.equal(getGithubEligibilityFailure(base, now), null);
  assert.equal(getGithubEligibilityFailure({ ...base, githubAccountCreatedAt: new Date("2026-01-19T00:00:01Z") }, now), "account_too_new");
  assert.equal(getGithubEligibilityFailure({ ...base, githubContributionCount: 9 }, now), "insufficient_contributions");
  assert.equal(getGithubEligibilityFailure({ ...base, githubContributionCount: null }, now), "provider_unavailable");
  assert.equal(getGithubEligibilityFailure({ ...base, githubUserId: null }, now), "not_connected");
});

test("GitHub contributions outside the authenticated previous-180-day snapshot cannot qualify", async () => {
  const { getGithubEligibilityFailure } = await import("./auth");
  const now = new Date("2026-07-18T00:00:00Z");
  const base = { githubUserId: "42", githubAccountCreatedAt: new Date("2020-01-01T00:00:00Z"), githubContributionCount: 10, githubContributionWindowStartedAt: new Date("2025-07-18T00:00:00Z"), githubContributionsUpdatedAt: now };
  assert.equal(getGithubEligibilityFailure(base, now), "provider_unavailable");
  assert.equal(getGithubEligibilityFailure({ ...base, githubContributionWindowStartedAt: new Date("2026-01-19T00:00:00Z"), githubContributionsUpdatedAt: new Date("2026-07-10T23:59:59Z") }, now), "reconnect_required");
});
