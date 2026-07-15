import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { builderPassesTable } from "./builderPasses";
import { builderTiersTable } from "./builderTiers";
import { builderVerificationSnapshotsTable } from "./builderVerificationSnapshots";

// Append-only upgrade log for a Builder Pass. The initial issuance is also
// recorded here (with `previousTierId` null) so the full timeline can be
// rendered from one query.
export const builderTierHistoryTable = pgTable("builder_tier_history", {
  id: serial("id").primaryKey(),
  builderPassId: integer("builder_pass_id").notNull().references(() => builderPassesTable.id),
  previousTierId: integer("previous_tier_id").references(() => builderTiersTable.id),
  newTierId: integer("new_tier_id").notNull().references(() => builderTiersTable.id),
  verificationSnapshotId: integer("verification_snapshot_id").references(() => builderVerificationSnapshotsTable.id),
  transactionHash: text("transaction_hash"),
  upgradedAt: timestamp("upgraded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuilderTierHistorySchema = createInsertSchema(builderTierHistoryTable).omit({ id: true });
export type InsertBuilderTierHistory = z.infer<typeof insertBuilderTierHistorySchema>;
export type BuilderTierHistory = typeof builderTierHistoryTable.$inferSelect;
