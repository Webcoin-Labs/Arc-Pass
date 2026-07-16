import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/arc_pass_test";
process.env.DISCORD_CLIENT_ID = "discord-client-id";
process.env.DISCORD_CLIENT_SECRET = "discord-client-secret";
process.env.DISCORD_REDIRECT_URI = "http://localhost:8080/api/auth/discord/callback";

test("Discord sign-in requests only the identity scope", async () => {
  const { buildDiscordAuthorizeUrl } = await import("./oauth/discord");
  const url = new URL(buildDiscordAuthorizeUrl("signed-state"));
  assert.equal(url.origin, "https://discord.com");
  assert.equal(url.searchParams.get("scope"), "identify");
});
