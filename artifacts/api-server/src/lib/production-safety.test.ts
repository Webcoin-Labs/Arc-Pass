import test from "node:test";
import assert from "node:assert/strict";
import { assertDevelopmentFixturePolicy, assertMockPolicy } from "./env";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/arc_pass_test";

test("production rejects development mocks", () => {
  assert.throws(() => assertMockPolicy("production", true), /forbidden in production/);
  assert.doesNotThrow(() => assertMockPolicy("development", true));
  assert.doesNotThrow(() => assertMockPolicy("production", false));
});

test("production rejects development identity and administrator fixtures", () => {
  const safe = {
    testIdentitiesEnabled: false,
    testIdentityHandlesConfigured: false,
    adminBootstrapEnabled: false,
    adminBootstrapEmailConfigured: false,
  };
  assert.doesNotThrow(() => assertDevelopmentFixturePolicy("production", safe));
  assert.doesNotThrow(() => assertDevelopmentFixturePolicy("development", { ...safe, testIdentitiesEnabled: true, adminBootstrapEnabled: true }));
  assert.throws(
    () => assertDevelopmentFixturePolicy("production", { ...safe, testIdentitiesEnabled: true }),
    /test identities are forbidden in production/,
  );
  assert.throws(
    () => assertDevelopmentFixturePolicy("production", { ...safe, adminBootstrapEmailConfigured: true }),
    /admin bootstrap is forbidden in production/,
  );
});

test("Founder invitations require a company name and accept a company logo", async () => {
  const { AdminCreateFounderInviteBody } = await import("@workspace/api-zod");
  const base = { invitePlatform: "x", inviteHandle: "founder" };
  assert.equal(AdminCreateFounderInviteBody.safeParse(base).success, false);
  assert.equal(AdminCreateFounderInviteBody.safeParse({ ...base, companyName: "Arc Labs", companyLogoUrl: "/uploads/logo.png" }).success, true);
});

test("Onchain Builder tier requires a qualifying contract and never downgrades", async () => {
  const { calculateBuilderTier, isUpgrade } = await import("./tier-config");
  const tiers = [
    { id: 1, slug: "bronze", name: "Bronze", rank: 1, transactionThreshold: 10, contractThreshold: 1 },
    { id: 2, slug: "silver", name: "Silver", rank: 2, transactionThreshold: 100, contractThreshold: 5 },
  ] as never;
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 10_000, validContractCount: 0 }), null);
  const silver = calculateBuilderTier(tiers, { qualifyingTransactionCount: 120, validContractCount: 1 });
  assert.equal(silver?.name, "Silver");
  assert.equal(isUpgrade(silver!, tiers[0] as never), false);
});
