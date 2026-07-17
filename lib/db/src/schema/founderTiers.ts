import { pgTable, text, serial, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Admin-configurable Founder tier (distinct from the Founder Pass variant —
// a tier is a recognition label like "Formal Founder"; a variant is the
// physical Normal/Premium Founder credential material).
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
