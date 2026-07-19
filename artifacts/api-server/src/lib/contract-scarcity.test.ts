import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

test("Builder contract has unlimited supply while preserving identity and upgrade integrity", async () => {
  const source = await readFile(path.join(workspace, "contracts/BuilderPass.sol"), "utf8");
  assert.doesNotMatch(source, /MAX_SUPPLY|remainingSupply|allocation complete/);
  assert.match(source, /function\s+transferFrom\b/);
  assert.match(source, /BuilderPass: non-transferable/);
  assert.match(source, /function\s+tokenURI\b/);
  assert.match(source, /supportsInterface/);
  assert.match(source, /identity already has a pass/);
  assert.match(source, /metadataUri/);
  assert.match(source, /block\.chainid/);
  assert.match(source, /non-canonical signature/);
  assert.match(source, /totalSupply \+= 1/);
  const revokeBody = source.match(/function revoke[\s\S]*?\n    }/)?.[0] || "";
  assert.doesNotMatch(revokeBody, /totalSupply\s*[-=]/);
  assert.match(source, /newTier > pass\.tier/);
  assert.match(source, /signature already used/);
});

test("Wave 1 allocation is reserved atomically at mint and never at inventory claim", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/routes/passes.ts"), "utf8");
  const allocation = await readFile(path.join(workspace, "artifacts/api-server/src/lib/wave-allocation.ts"), "utf8");
  assert.match(allocation, /pg_advisory_xact_lock/);
  assert.match(allocation, /mintedCount \+ reservedCount >= limit/);
  assert.match(allocation, /waveMintReservedAt: reservationTime/);
  assert.match(allocation, /waveMintReservedAt: null/);
  assert.match(source, /reserveBuilderWaveMint\(pass\.id, configuration\.builderPhaseClaimLimit, reservationTime\)/);
  assert.match(source, /claimStatus: "claimed"/);
  const claimRoute = source.match(/router\.post\("\/passes\/builder\/claim"[\s\S]*?router\.post\("\/passes\/builder\/mint"/)?.[0] ?? "";
  assert.doesNotMatch(claimRoute, /builderPhaseClaimLimit/);
});

test("Wave 1 exact claim-versus-mint invariants are encoded in the API boundary", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/routes/passes.ts"), "utf8");
  const claimRoute = source.match(/router\.post\("\/passes\/builder\/claim"[\s\S]*?router\.post\("\/passes\/builder\/mint"/)?.[0] ?? "";
  const mintRoute = source.match(/router\.post\("\/passes\/builder\/mint"[\s\S]*?export default router/)?.[0] ?? "";
  const allocation = await readFile(path.join(workspace, "artifacts/api-server/src/lib/wave-allocation.ts"), "utf8");

  // Inventory claim remains possible after slot 2,499 and never reserves or
  // increments the onchain allocation.
  assert.doesNotMatch(claimRoute, /builderPhaseClaimLimit|waveMintReservedAt/);
  assert.match(claimRoute, /claimStatus: "claimed"/);

  // A failed provider call releases the reservation; only the confirmed
  // receipt path changes claimStatus to minted.
  assert.match(mintRoute, /catch \(error\)[\s\S]*releaseBuilderWaveMintReservation/);
  assert.match(mintRoute, /claimStatus: "minted"/);
  assert.match(mintRoute, /transactionHash: mintResult\.transactionHash/);

  // Replays stop before allocation and concurrent final-slot callers are
  // serialized while both confirmed mints and in-flight reservations count.
  assert.match(mintRoute, /pass\.claimStatus === "minted"/);
  assert.match(mintRoute, /reserveBuilderWaveMint/);
  assert.match(allocation, /pg_advisory_xact_lock/);
  assert.match(allocation, /mintedCount \+ reservedCount >= limit/);
  assert.doesNotMatch(allocation, /reservationExpiresBefore|waveMintReservedAt, reservationExpiresBefore/);
});

test("Wave-full UI disables only minting and keeps the claimed credential", async () => {
  const claimPage = await readFile(path.join(workspace, "artifacts/arc-pass/src/pages/claim-builder.tsx"), "utf8");
  const dashboard = await readFile(path.join(workspace, "artifacts/arc-pass/src/pages/dashboard.tsx"), "utf8");
  assert.match(claimPage, /disabled=\{supply\?\.remainingClaims === 0\}/);
  assert.match(claimPage, /Added to your inventory/);
  assert.match(dashboard, /Wave 1 mint unavailable · credential remains in your account/);
});

test("Founder contract keeps variant immutable and exposes no transfer API", async () => {
  const source = await readFile(path.join(workspace, "contracts/FounderPass.sol"), "utf8");
  assert.match(source, /function\s+transferFrom\b/);
  assert.match(source, /FounderPass: non-transferable/);
  assert.match(source, /function\s+tokenURI\b/);
  assert.match(source, /supportsInterface/);
  assert.doesNotMatch(source, /function\s+setVariant\b/);
  assert.match(source, /identity already has a pass/);
  assert.match(source, /signature already used/);
  assert.match(source, /metadataUri/);
  assert.match(source, /block\.chainid/);
  assert.match(source, /non-canonical signature/);
});

test("Both mint routes require an ownership-verified destination wallet", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/routes/passes.ts"), "utf8");
  assert.match(source, /isOwnershipVerifiedWallet/);
  assert.equal(source.match(/A non-transferable pass can only be minted to a wallet you have ownership-verified\./g)?.length, 2);
});

test("Founder claims use the verified invitation identity and do not require GitHub", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/routes/passes.ts"), "utf8");
  const founderClaim = source.match(/router\.post\("\/passes\/founder\/claim"[\s\S]*?router\.post\("\/passes\/founder\/mint"/)?.[0] ?? "";
  assert.doesNotMatch(founderClaim, /hasVerifiedGithub|github_verification_required|Connect and verify your GitHub/);
  assert.match(founderClaim, /eligibilityStatus !== "eligible"/);
});

test("inventory claims allocate stable credential numbers before onchain minting", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/routes/passes.ts"), "utf8");
  const founderClaim = source.match(/router\.post\("\/passes\/founder\/claim"[\s\S]*?router\.post\("\/passes\/founder\/mint"/)?.[0] ?? "";
  const founderMint = source.match(/router\.post\("\/passes\/founder\/mint"[\s\S]*?\/\/ ---------------------------------------------------------------------------\n\/\/ Builder Pass/)?.[0] ?? "";
  const builderClaim = source.match(/router\.post\("\/passes\/builder\/claim"[\s\S]*?router\.post\("\/passes\/builder\/mint"/)?.[0] ?? "";

  assert.match(founderClaim, /pg_advisory_xact_lock\(1095781717\)/);
  assert.match(founderClaim, /coalesce\(max\([^)]*passNumber[^)]*\), 0\)::int \+ 1/);
  assert.match(founderClaim, /passNumber: pass\.passNumber \?\? nextPassNumber/);
  assert.doesNotMatch(founderMint, /passNumber:/);

  assert.match(builderClaim, /pg_advisory_xact_lock\(1095781716\)/);
  assert.match(builderClaim, /coalesce\(max\([^)]*passNumber[^)]*\), 0\)::int \+ 1/);
  assert.match(builderClaim, /passNumber: pass\.passNumber \?\? nextPassNumber/);
});

test("Builder tier names and transaction thresholds are fixed product rules", async () => {
  const adminSource = await readFile(path.join(workspace, "artifacts/api-server/src/routes/admin.ts"), "utf8");
  const migration = await readFile(path.join(workspace, "lib/db/migrations/0012_fixed_builder_tier_thresholds.sql"), "utf8");

  assert.match(adminSource, /Builder tier names, thresholds, order, and active state are fixed product rules/);
  assert.match(adminSource, /body\.data\.contractThreshold !== 0/);
  assert.match(migration, /\('bronze', 'Bronze', 1, 2\)/);
  assert.match(migration, /\('silver', 'Silver', 2, 10\)/);
  assert.match(migration, /\('gold', 'Gold', 3, 50\)/);
  assert.match(migration, /\('platinum', 'Platinum', 4, 100\)/);
  assert.match(migration, /\('diamond', 'Diamond', 5, 1000\)/);
  assert.match(migration, /contract_threshold = 0/);
});
