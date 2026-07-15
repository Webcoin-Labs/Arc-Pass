import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { founderTiersTable } from "./founderTiers";

// One row per Founder identity. Rows can exist before the identity ever logs
// in (an admin-created invite keyed by `inviteHandle`/`invitePlatform`) — the
// row is linked to `userId` the moment that handle first authenticates.
// Once `permanentlyLockedAt` is set (at mint), `variant`, `founderTierId`,
// and identity fields must never change again — enforced in the route layer.
export const founderPassesTable = pgTable("founder_passes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).unique(),

  // Pre-signup invite matching — used to link this row to a user on first login.
  inviteHandle: text("invite_handle"),
  invitePlatform: text("invite_platform"), // 'x' | 'discord'
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  invitedByUserId: integer("invited_by_user_id").references(() => usersTable.id),

  variant: text("variant").notNull().default("normal"), // 'normal' | 'premium_black'
  founderTierId: integer("founder_tier_id").references(() => founderTiersTable.id),

  displayName: text("display_name"),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  founderTitle: text("founder_title"),

  companyName: text("company_name"),
  companyIndustry: text("company_industry"),
  companyLogoUrl: text("company_logo_url"),
  companyWebsite: text("company_website"),
  companyLocation: text("company_location"),
  startupStage: text("startup_stage"),
  founderStatement: text("founder_statement"),
  companyDescription: text("company_description"),

  // 'eligible' | 'invite_required' | 'under_review' | 'ineligible'
  eligibilityStatus: text("eligibility_status").notNull().default("invite_required"),
  // 'locked' | 'claimed' | 'minted'
  claimStatus: text("claim_status").notNull().default("locked"),

  passNumber: integer("pass_number").unique(),
  network: text("network"),
  tokenId: text("token_id"),
  contractAddress: text("contract_address"),
  destinationWallet: text("destination_wallet"),
  transactionHash: text("transaction_hash"),

  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  issuedAt: timestamp("issued_at", { withTimezone: true }),
  permanentlyLockedAt: timestamp("permanently_locked_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedReason: text("revoked_reason"),

  adminNotes: text("admin_notes"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFounderPassSchema = createInsertSchema(founderPassesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFounderPass = z.infer<typeof insertFounderPassSchema>;
export type FounderPass = typeof founderPassesTable.$inferSelect;
