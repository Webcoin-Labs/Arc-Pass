import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const oauthStatesTable = pgTable("oauth_states", {
  id: serial("id").primaryKey(),
  nonceHash: text("nonce_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
