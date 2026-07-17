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

test("Phase 1 claim allocation is enforced atomically by the backend", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/routes/passes.ts"), "utf8");
  assert.match(source, /pg_advisory_xact_lock/);
  assert.match(source, /claimedCount >= configuration\.builderPhaseClaimLimit/);
  assert.match(source, /claimStatus: "claimed"/);
  assert.doesNotMatch(source, /mintedCount >=/);
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
