import { db, pool, founderTiersTable, builderTiersTable } from "./index";
import { eq, inArray } from "drizzle-orm";

// Seeds the two tier-configuration tables with sensible starting values.
// Safe to re-run — existing rows (matched by unique name/slug) are left
// untouched. Admins can rename, re-order, or deactivate any of these from
// the admin panel afterwards; nothing in the app hardcodes these names.
async function seed() {
  await db
    .insert(founderTiersTable)
    .values([
      { name: "Emerging Founder", rank: 1, description: "Early-stage founders building their first verified track record.", isActive: true },
      { name: "Formal Founder", rank: 2, description: "Founders with a confirmed company and verified identity.", isActive: true },
      { name: "Premier Founder", rank: 3, description: "Recognized founders with significant ecosystem contribution.", isActive: true },
    ])
    .onConflictDoNothing({ target: founderTiersTable.name });

  // Keep the active Founder catalog intentionally small. Legacy labels remain
  // in the table so already-issued credentials can still render historically,
  // but they cannot be selected for new invitations or edits.
  await db
    .update(founderTiersTable)
    .set({ isActive: false })
    .where(inArray(founderTiersTable.name, ["Verified Founder", "Growth Founder", "Network Founder"]));

  await db
    .update(founderTiersTable)
    .set({ rank: 1, isActive: true })
    .where(eq(founderTiersTable.name, "Emerging Founder"));
  await db
    .update(founderTiersTable)
    .set({ rank: 2, isActive: true })
    .where(eq(founderTiersTable.name, "Formal Founder"));
  await db
    .update(founderTiersTable)
    .set({ rank: 3, isActive: true })
    .where(eq(founderTiersTable.name, "Premier Founder"));

  await db
    .insert(builderTiersTable)
    .values([
      { slug: "bronze", name: "Bronze", rank: 1, transactionThreshold: 10, contractThreshold: 2, description: "Early verified builder activity.", isActive: true, emblemUrl: "/tiers/bronze.png" },
      { slug: "silver", name: "Silver", rank: 2, transactionThreshold: 50, contractThreshold: 10, description: "Consistent verified builder activity.", isActive: true, emblemUrl: "/tiers/silver.png" },
      { slug: "gold", name: "Gold", rank: 3, transactionThreshold: 100, contractThreshold: 50, description: "Substantial verified builder activity.", isActive: true, emblemUrl: "/tiers/gold.png" },
      { slug: "platinum", name: "Platinum", rank: 4, transactionThreshold: 500, contractThreshold: 100, description: "Extensive verified builder activity.", isActive: true, emblemUrl: "/tiers/platinum.png" },
      { slug: "diamond", name: "Diamond", rank: 5, transactionThreshold: 1000, contractThreshold: 200, description: "The highest tier of verified builder activity.", isActive: true, emblemUrl: "/tiers/diamond.png" },
    ])
    .onConflictDoNothing({ target: builderTiersTable.slug });

  // eslint-disable-next-line no-console
  console.log("Seed complete: founder tiers + builder tiers.");
  await pool.end();
}

seed().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Seed failed:", err);
  process.exit(1);
});
