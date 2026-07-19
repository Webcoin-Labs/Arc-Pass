import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { builderPassesTable } from "./builderPasses";
import { builderTiersTable } from "./builderTiers";

// A cached result of one Builder analysis run (initial verification or a
// re-verification). Deterministic on-chain counts come from the chain
// adapter; `githubSummary`/`ecosystemSummary` may be produced qualitatively
// by Gemini, but `calculatedTierId` is always derived from the deterministic
// counts, never from Gemini output (see api-server/src/lib/gemini-adapter.ts).
export const builderVerificationSnapshotsTable = pgTable("builder_verification_snapshots", {
  id: serial("id").primaryKey(),
  builderPassId: integer("builder_pass_id").notNull().references(() => builderPassesTable.id),

  githubSummary: text("github_summary"),
  walletSummary: jsonb("wallet_summary").$type<{ address: string; chain: string }[]>(),
  contractSummary: text("contract_summary"),
  ecosystemSummary: text("ecosystem_summary"),

  qualifyingTransactionCount: integer("qualifying_transaction_count").notNull().default(0),
  validContractCount: integer("valid_contract_count").notNull().default(0),
  calculatedTierId: integer("calculated_tier_id").references(() => builderTiersTable.id),

  // Optional "wrapped" display stats supplied by the activity provider.
  // Decimal token amounts are stored as strings to avoid float drift; all
  // three stay null when the provider does not report them.
  usdcSpent: text("usdc_spent"),
  eurcSpent: text("eurc_spent"),
  firstTransactionAt: timestamp("first_transaction_at", { withTimezone: true }),

  analysisTimestamp: timestamp("analysis_timestamp", { withTimezone: true }).notNull().defaultNow(),
  lastReviewedBlock: text("last_reviewed_block"),
  internalRiskFlags: jsonb("internal_risk_flags").$type<string[]>(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBuilderVerificationSnapshotSchema = createInsertSchema(builderVerificationSnapshotsTable).omit({ id: true, createdAt: true });
export type InsertBuilderVerificationSnapshot = z.infer<typeof insertBuilderVerificationSnapshotSchema>;
export type BuilderVerificationSnapshot = typeof builderVerificationSnapshotsTable.$inferSelect;
