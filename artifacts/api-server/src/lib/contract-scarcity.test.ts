import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

test("Builder contract encodes lifetime supply and revocation does not restore it", async () => {
  const source = await readFile(path.join(workspace, "contracts/BuilderPass.sol"), "utf8");
  assert.match(source, /MAX_SUPPLY = 1500/);
  assert.match(source, /require\(totalSupply < MAX_SUPPLY/);
  assert.match(source, /return MAX_SUPPLY - totalSupply/);
  const revokeBody = source.match(/function revoke[\s\S]*?\n    }/)?.[0] || "";
  assert.doesNotMatch(revokeBody, /totalSupply\s*[-=]/);
  assert.match(source, /newTier > pass\.tier/);
  assert.match(source, /signature already used/);
});

test("Founder contract keeps variant immutable and exposes no transfer API", async () => {
  const source = await readFile(path.join(workspace, "contracts/FounderPass.sol"), "utf8");
  assert.doesNotMatch(source, /function\s+(transfer|transferFrom|safeTransferFrom|setVariant)\b/);
  assert.match(source, /identity already has a pass/);
  assert.match(source, /signature already used/);
});
