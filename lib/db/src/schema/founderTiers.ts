import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Founder tier (distinct from the Founder Pass variant). The selectable catalog
// is fixed to Emerging Founder and Premier Founder; admins may only customize
// presentation fields. A variant is the Normal/Premium credential material.
export const founderTiersTable = pgTable("founder_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  emblemUrl: text("emblem_url"),
  description: text("description"),
  visualConfig: jsonb("visual_config").$type<{ accent?: string }>(),
  rank: integer("rank").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFounderTierSchema = createInsertSchema(founderTiersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFounderTier = z.infer<typeof insertFounderTierSchema>;
export type FounderTier = typeof founderTiersTable.$inferSelect;
