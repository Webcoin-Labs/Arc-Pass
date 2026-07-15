import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Tracks every signed mint/upgrade authorization ticket the server has ever
// issued (see api-server/src/lib/signed-claims.ts). A ticket's nonce can be
// consumed exactly once — this is what makes mint/upgrade authorizations
// replay-protected even before a real contract-level nonce check exists
// onchain.
export const mintAuthorizationsTable = pgTable("mint_authorizations", {
  id: serial("id").primaryKey(),
  nonce: text("nonce").notNull().unique(),
  passType: text("pass_type").notNull(), // 'founder' | 'builder'
  passId: integer("pass_id").notNull(),
  action: text("action").notNull(), // 'mint' | 'upgrade'
  destinationWallet: text("destination_wallet").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const insertMintAuthorizationSchema = createInsertSchema(mintAuthorizationsTable).omit({ id: true, issuedAt: true });
export type InsertMintAuthorization = z.infer<typeof insertMintAuthorizationSchema>;
export type MintAuthorization = typeof mintAuthorizationsTable.$inferSelect;
