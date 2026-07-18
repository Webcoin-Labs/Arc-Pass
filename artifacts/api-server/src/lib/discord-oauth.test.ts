import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/arc_pass_test";
process.env.DISCORD_CLIENT_ID = "discord-client-id";
process.env.DISCORD_CLIENT_SECRET = "discord-client-secret";
process.env.DISCORD_REDIRECT_URI = "http://localhost:8080/api/auth/discord/callback";

test("Discord sign-in requests identity and current-member scopes", async () => {
  const { buildDiscordAuthorizeUrl } = await import("./oauth/discord");
  const url = new URL(buildDiscordAuthorizeUrl("signed-state"));
  assert.equal(url.origin, "https://discord.com");
  assert.equal(url.searchParams.get("scope"), "identify guilds.members.read");
});

test("Discord Arc membership reports member status and join date from OAuth alone", async (t) => {
  const { getArcGuildMembership } = await import("./oauth/discord");
  const originalFetch = globalThis.fetch;
  const previousGuild = process.env.ARC_DISCORD_GUILD_ID;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousGuild === undefined) delete process.env.ARC_DISCORD_GUILD_ID;
    else process.env.ARC_DISCORD_GUILD_ID = previousGuild;
  });

  process.env.ARC_DISCORD_GUILD_ID = "arc-guild";
  globalThis.fetch = (async (input: string | URL | Request) => {
    assert.ok(String(input).includes("/users/@me/guilds/"));
    return Response.json({ joined_at: "2026-07-01T00:00:00.000Z" });
  }) as typeof fetch;

  assert.deepEqual(await getArcGuildMembership("user-token"), {
    member: true,
    joinedAt: "2026-07-01T00:00:00.000Z",
  });
});

test("Discord Arc membership returns false for a non-member without a bot token", async (t) => {
  const { getArcGuildMembership } = await import("./oauth/discord");
  const originalFetch = globalThis.fetch;
  const previousGuild = process.env.ARC_DISCORD_GUILD_ID;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousGuild === undefined) delete process.env.ARC_DISCORD_GUILD_ID;
    else process.env.ARC_DISCORD_GUILD_ID = previousGuild;
  });

  process.env.ARC_DISCORD_GUILD_ID = "arc-guild";
  globalThis.fetch = (async () => new Response(null, { status: 404 })) as typeof fetch;

  assert.deepEqual(await getArcGuildMembership("user-token"), { member: false, joinedAt: null });
});
