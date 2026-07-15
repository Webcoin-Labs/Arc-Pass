import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Admin-configurable Builder tier. `slug` is the stable programmatic key
// (bronze/silver/gold/platinum/diamond) used by tier-calculation logic —
// `name`/`emblemUrl`/`description` can be renamed by an admin without
// breaking threshold lookups. Thresholds are OR'd against each other
// (qualifying transactions OR valid contracts deployed), see
// api-server/src/lib/tier-config.ts.
export const builderTiersTable = pgTable("builder_tiers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(), // 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  name: text("name").notNull(),
  emblemUrl: text("emblem_url"),
  transactionThreshold: integer("transaction_threshold").notNull(),
  contractThreshold: integer("contract_threshold").notNull(),
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
