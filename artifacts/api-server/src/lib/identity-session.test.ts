import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/arc_pass_test";

test("X handles strip @ and normalize lowercase", async () => {
  const { normalizeXHandle } = await import("./identity");
  assert.equal(normalizeXHandle("  @@SolRishu  "), "solrishu");
});

test("Discord accepts modern and legacy identities without requiring a discriminator", async () => {
  const { parseDiscordIdentity, displayDiscordIdentity } = await import("./identity");
  assert.deepEqual(parseDiscordIdentity("ArcBuilder"), { username: "arcbuilder", discriminator: null });
  assert.deepEqual(parseDiscordIdentity("ArcBuilder#1234"), { username: "arcbuilder", discriminator: "1234" });
  assert.deepEqual(parseDiscordIdentity("ArcBuilder", "#9876"), { username: "arcbuilder", discriminator: "9876" });
  assert.equal(displayDiscordIdentity("arcbuilder", "1234"), "arcbuilder#1234");
});

test("sessions refresh only inside the final 24 hours", async () => {
  const { shouldRefreshSession } = await import("./auth");
  const now = new Date("2026-07-18T00:00:00Z");
  assert.equal(shouldRefreshSession(new Date("2026-07-19T00:00:01Z"), now), false);
  assert.equal(shouldRefreshSession(new Date("2026-07-19T00:00:00Z"), now), true);
});
