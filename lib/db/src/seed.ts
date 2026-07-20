import { db, pool, founderTiersTable, builderTiersTable } from "./index";
import { eq, notInArray } from "drizzle-orm";

// Seeds the fixed two-tier Founder catalog and the configurable Builder tiers.
// Safe to re-run: Founder tier names, order, and active state remain policy.
async function seed() {
  await db
    .insert(founderTiersTable)
    .values([
      { name: "Emerging Founder", rank: 1, description: "Early-stage founders building their first verified track record.", isActive: true },
      { name: "Premier Founder", rank: 2, description: "Recognized founders with significant ecosystem contribution.", isActive: true },
    ])
    .onConflictDoNothing({ target: founderTiersTable.name });

  // Keep the active Founder catalog intentionally small. Legacy labels remain
  // in the table so already-issued credentials can still render historically,
  // but they cannot be selected for new invitations or edits.
  await db
    .update(founderTiersTable)
    .set({ isActive: false })
    .where(notInArray(founderTiersTable.name, ["Emerging Founder", "Premier Founder"]));

  await db
    .update(founderTiersTable)
    .set({ rank: 1, isActive: true })
    .where(eq(founderTiersTable.name, "Emerging Founder"));
  await db
    .update(founderTiersTable)
    .set({ rank: 2, isActive: true })
    .where(eq(founderTiersTable.name, "Premier Founder"));

  await db
    .insert(builderTiersTable)
    .values([
      { slug: "bronze", name: "Bronze", rank: 1, transactionThreshold: 2, contractThreshold: 0, description: "2+ Arc transactions OR 10+ GitHub contributions with a 180-day-old account.", isActive: true, emblemUrl: "/tiers/bronze.png" },
      { slug: "silver", name: "Silver", rank: 2, transactionThreshold: 10, contractThreshold: 0, description: "10+ Arc transactions OR 250+ GitHub contributions with a 1-year-old account.", isActive: true, emblemUrl: "/tiers/silver.png" },
      { slug: "gold", name: "Gold", rank: 3, transactionThreshold: 50, contractThreshold: 0, description: "50+ Arc transactions OR 750+ GitHub contributions with a 2-year-old account.", isActive: true, emblemUrl: "/tiers/gold.png" },
      { slug: "platinum", name: "Platinum", rank: 4, transactionThreshold: 100, contractThreshold: 0, description: "100+ Arc transactions OR 1,500+ GitHub contributions with a 3-year-old account.", isActive: true, emblemUrl: "/tiers/platinum.png" },
      { slug: "diamond", name: "Diamond", rank: 5, transactionThreshold: 1000, contractThreshold: 0, description: "1,000+ Arc transactions OR 3,000+ GitHub contributions with a 4-year-old account.", isActive: true, emblemUrl: "/tiers/diamond.png" },
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
