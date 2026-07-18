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

test("Onchain Builder tiers use the exact qualifying transaction boundaries and never downgrade", async () => {
  const { calculateBuilderTier, isUpgrade } = await import("./tier-config");
  const tiers = [
    { id: 1, slug: "bronze", name: "Bronze", rank: 1, transactionThreshold: 2, contractThreshold: 0 },
    { id: 2, slug: "silver", name: "Silver", rank: 2, transactionThreshold: 10, contractThreshold: 0 },
    { id: 3, slug: "gold", name: "Gold", rank: 3, transactionThreshold: 50, contractThreshold: 0 },
    { id: 4, slug: "platinum", name: "Platinum", rank: 4, transactionThreshold: 100, contractThreshold: 0 },
    { id: 5, slug: "diamond", name: "Diamond", rank: 5, transactionThreshold: 1000, contractThreshold: 0 },
  ] as never;
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 0, validContractCount: 99 }), null);
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 1, validContractCount: 99 }), null);
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 2, validContractCount: 0 })?.name, "Bronze");
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 9, validContractCount: 0 })?.name, "Bronze");
  const silver = calculateBuilderTier(tiers, { qualifyingTransactionCount: 10, validContractCount: 0 });
  assert.equal(silver?.name, "Silver");
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 49, validContractCount: 0 })?.name, "Silver");
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 50, validContractCount: 0 })?.name, "Gold");
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 99, validContractCount: 0 })?.name, "Gold");
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 100, validContractCount: 0 })?.name, "Platinum");
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 999, validContractCount: 0 })?.name, "Platinum");
  assert.equal(calculateBuilderTier(tiers, { qualifyingTransactionCount: 1000, validContractCount: 0 })?.name, "Diamond");
  assert.equal(isUpgrade(silver!, tiers[0] as never), false);
});
