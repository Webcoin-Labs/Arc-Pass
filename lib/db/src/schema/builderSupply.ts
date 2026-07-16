import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

// Operational release-phase snapshot. The contract itself has no supply cap;
// claim allocation is enforced atomically from builder_passes by the API.
export const builderSupplyTable = pgTable("builder_supply", {
  id: serial("id").primaryKey(),
  phaseName: text("phase_name").notNull().default("Wave 1"),
  phaseClaimLimit: integer("phase_claim_limit").notNull().default(2499),
  totalClaimedCount: integer("total_claimed_count").notNull().default(0),
  totalMintedCount: integer("total_minted_count").notNull().default(0),
  activeCount: integer("active_count").notNull().default(0),
  revokedCount: integer("revoked_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
