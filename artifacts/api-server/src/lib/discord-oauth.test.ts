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

test("Discord Arc membership captures role IDs and resolves role names with the bot", async (t) => {
  const { getArcGuildMembership } = await import("./oauth/discord");
  const originalFetch = globalThis.fetch;
  const previousGuild = process.env.ARC_DISCORD_GUILD_ID;
  const previousBot = process.env.DISCORD_BOT_TOKEN;
  const previousPrimaryRoles = process.env.ARC_DISCORD_PRIMARY_ROLE_IDS;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (previousGuild === undefined) delete process.env.ARC_DISCORD_GUILD_ID;
    else process.env.ARC_DISCORD_GUILD_ID = previousGuild;
    if (previousBot === undefined) delete process.env.DISCORD_BOT_TOKEN;
    else process.env.DISCORD_BOT_TOKEN = previousBot;
    if (previousPrimaryRoles === undefined) delete process.env.ARC_DISCORD_PRIMARY_ROLE_IDS;
    else process.env.ARC_DISCORD_PRIMARY_ROLE_IDS = previousPrimaryRoles;
  });

  process.env.ARC_DISCORD_GUILD_ID = "arc-guild";
  process.env.DISCORD_BOT_TOKEN = "bot-token";
  process.env.ARC_DISCORD_PRIMARY_ROLE_IDS = "role-1,role-2";
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("/users/@me/guilds/")) return Response.json({ joined_at: "2026-07-01T00:00:00.000Z", roles: ["role-1"] });
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bot bot-token");
    return Response.json([{ id: "role-1", name: "Arc Builder" }, { id: "role-2", name: "Core Builder" }]);
  }) as typeof fetch;

  assert.deepEqual(await getArcGuildMembership("user-token"), {
    member: true,
    joinedAt: "2026-07-01T00:00:00.000Z",
    roleIds: ["role-1"],
    roleNames: ["Arc Builder"],
    primaryRoles: [
      { id: "role-1", name: "Arc Builder", hasRole: true },
      { id: "role-2", name: "Core Builder", hasRole: false },
    ],
  });
});
