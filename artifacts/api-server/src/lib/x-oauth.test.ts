import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/arc_pass_test";
process.env.X_CLIENT_ID = "x-client-id";
process.env.X_CLIENT_SECRET = "x-client-secret";
process.env.X_REDIRECT_URI = "http://localhost:8080/api/auth/x/callback";

test("X authorization uses the current X host and required identity scopes", async () => {
  const { buildXAuthorizeUrl } = await import("./oauth/x");
  const url = new URL(buildXAuthorizeUrl("signed-state", "pkce-challenge"));

  assert.equal(url.origin, "https://x.com");
  assert.equal(url.pathname, "/i/oauth2/authorize");
  assert.equal(url.searchParams.get("scope"), "tweet.read users.read");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
});

test("X code exchange uses api.x.com and fetches the verified account with the user token", async (t) => {
  const { exchangeXCode } = await import("./oauth/x");
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/2/oauth2/token")) {
      return Response.json({ access_token: "user-access-token" });
    }
    return Response.json({
      data: {
        id: "12345",
        username: "SolRishu",
        name: "Rishu",
        profile_image_url: "https://pbs.twimg.com/avatar_normal.jpg",
      },
    });
  }) as typeof fetch;

  const profile = await exchangeXCode("authorization-code", "pkce-verifier");

  assert.equal(calls[0]?.url, "https://api.x.com/2/oauth2/token");
  assert.equal(calls[1]?.url, "https://api.x.com/2/users/me?user.fields=profile_image_url");
  assert.equal(new Headers(calls[1]?.init?.headers).get("Authorization"), "Bearer user-access-token");
  assert.deepEqual(profile, {
    providerUserId: "12345",
    username: "SolRishu",
    displayName: "Rishu",
    avatarUrl: "https://pbs.twimg.com/avatar_400x400.jpg",
  });
});
