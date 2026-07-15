import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { builderTiersTable } from "./builderTiers";

// One row per Builder identity — created the first time verification
// succeeds. Re-verification and tier upgrades update this same row (same
// `id`, same `passNumber`, same `tokenId` where technically possible); they
// never create a second row for the same `userId`. Total unique supply is
// therefore just `count(*)` against this table, capped at 1,500 in the
// route layer (see api-server/src/lib/tier-config.ts).
export const builderPassesTable = pgTable("builder_passes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id).unique(),

  currentTierId: integer("current_tier_id").references(() => builderTiersTable.id),
  builderRole: text("builder_role"),
  primaryEcosystem: text("primary_ecosystem"),

  // Set by POST /passes/builder/reverify when a higher tier is detected;
  // cleared once POST /passes/builder/upgrade applies it (or superseded by
  // the next re-verification). Nothing is upgraded until the holder
  // explicitly confirms.
  proposedTierId: integer("proposed_tier_id").references(() => builderTiersTable.id),
  proposedTierSnapshotId: integer("proposed_tier_snapshot_id"),

  // 'eligible' | 'ineligible' | 'verification_required' | 'analysis_in_progress'
  eligibilityStatus: text("eligibility_status").notNull().default("verification_required"),
  // 'locked' | 'claimed' | 'minted'
  claimStatus: text("claim_status").notNull().default("locked"),

  passNumber: integer("pass_number").unique(),
  network: text("network"),
  tokenId: text("token_id"),
  contractAddress: text("contract_address"),
  destinationWallet: text("destination_wallet"),
  transactionHash: text("transaction_hash"),

  initiallyIssuedAt: timestamp("initially_issued_at", { withTimezone: true }),
  lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
  nextVerificationAt: timestamp("next_verification_at", { withTimezone: true }),
  lastTierUpgradeAt: timestamp("last_tier_upgrade_at", { withTimezone: true }),

  isSuspended: boolean("is_suspended").notNull().default(false),
  suspendedReason: text("suspended_reason"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  revokedReason: text("revoked_reason"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBuilderPassSchema = createInsertSchema(builderPassesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuilderPass = z.infer<typeof insertBuilderPassSchema>;
export type BuilderPass = typeof builderPassesTable.$inferSelect;
