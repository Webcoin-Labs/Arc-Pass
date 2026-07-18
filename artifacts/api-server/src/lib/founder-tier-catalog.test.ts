import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  FOUNDER_TIER_CATALOG,
  FOUNDER_TIER_NAMES,
  getFounderTierCatalogEntry,
} from "./founder-tier-catalog";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

test("Founder tier catalog contains exactly Emerging and Premier", () => {
  assert.deepEqual(FOUNDER_TIER_CATALOG, [
    { name: "Emerging Founder", rank: 1 },
    { name: "Premier Founder", rank: 2 },
  ]);
  assert.deepEqual(FOUNDER_TIER_NAMES, ["Emerging Founder", "Premier Founder"]);
  assert.equal(getFounderTierCatalogEntry("Formal Founder"), undefined);
});

test("Founder tier migration preserves minted credentials and deactivates legacy tiers", async () => {
  const source = await readFile(
    path.join(workspace, "lib/db/migrations/0006_founder_two_tier_catalog.sql"),
    "utf8",
  );

  assert.match(source, /permanently_locked_at IS NULL/);
  assert.match(source, /name IN \('Emerging Founder', 'Premier Founder'\)/);
  assert.match(source, /is_active = name IN \('Emerging Founder', 'Premier Founder'\)/);
});

test("Admin API filters and protects the fixed Founder tier catalog", async () => {
  const source = await readFile(
    path.join(workspace, "artifacts/api-server/src/routes/admin.ts"),
    "utf8",
  );

  assert.match(source, /inArray\(founderTiersTable\.name, FOUNDER_TIER_NAMES\)/);
  assert.match(source, /FOUNDER_TIER_CATALOG_ERROR/);
  assert.match(source, /body\.data\.name !== catalogTier\.name/);
  assert.match(source, /body\.data\.rank !== catalogTier\.rank/);
});
