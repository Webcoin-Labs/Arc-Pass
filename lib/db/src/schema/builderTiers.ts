import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Builder tier catalog. Slug, name, rank, active state, and qualifying Arc
// transaction thresholds are fixed product rules. The parallel GitHub/age
// policy lives in api-server/src/lib/builder-tier-policy.ts. Administrators
// may update presentation fields, while deployed-contract counts remain
// evidence only and never affect tier calculation.
export const builderTiersTable = pgTable("builder_tiers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  name: text("name").notNull(),
  emblemUrl: text("emblem_url"),
  transactionThreshold: integer("transaction_threshold").notNull(),
  contractThreshold: integer("contract_threshold").notNull().default(0),
  description: text("description"),
  visualConfig: jsonb("visual_config").$type<{ accent?: string }>(),
  rank: integer("rank").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBuilderTierSchema = createInsertSchema(builderTiersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBuilderTier = z.infer<typeof insertBuilderTierSchema>;
export type BuilderTier = typeof builderTiersTable.$inferSelect;
