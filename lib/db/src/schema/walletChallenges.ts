import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const walletChallengesTable = pgTable("wallet_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  requestedAddress: text("requested_address").notNull(),
  nonceHash: text("nonce_hash").notNull().unique(),
  domain: text("domain").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WalletChallenge = typeof walletChallengesTable.$inferSelect;
