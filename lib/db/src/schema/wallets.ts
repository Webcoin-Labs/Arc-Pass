import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  address: text("address").notNull().unique(),
  isPrimary: boolean("is_primary").notNull().default(false),
  label: text("label"),
  chain: text("chain").notNull().default("evm"),
  ownershipVerifiedAt: timestamp("ownership_verified_at", { withTimezone: true }),
  signatureMethod: text("signature_method"),
  lastAnalysedAt: timestamp("last_analysed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
