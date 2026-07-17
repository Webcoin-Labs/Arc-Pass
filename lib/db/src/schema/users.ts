import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface DiscordArcPrimaryRole {
  id: string;
  name: string | null;
  hasRole: boolean | null;
}

// An identity represents one verified person. Session login happens through
// exactly one provider (`provider`/`providerId`), but a single identity can
// accumulate stable platform IDs across X, Discord and GitHub as they connect
// more accounts during Builder verification.
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  provider: text("provider").notNull(), // 'x' | 'discord'
  providerId: text("provider_id").notNull().unique(),

  xUserId: text("x_user_id").unique(),
  xUsername: text("x_username"),
  discordUserId: text("discord_user_id").unique(),
  discordUsername: text("discord_username"),
  discordAvatarUrl: text("discord_avatar_url"),
  githubUserId: text("github_user_id").unique(),
  githubUsername: text("github_username"),
  /** Snapshot captured from GitHub's contribution calendar during OAuth linking. */
  githubContributionCount: integer("github_contribution_count"),
  githubContributionsUpdatedAt: timestamp("github_contributions_updated_at", { withTimezone: true }),

  /** Best-effort membership snapshot for the configured Arc Discord server. */
  discordArcMember: boolean("discord_arc_member"),
  discordArcJoinedAt: timestamp("discord_arc_joined_at", { withTimezone: true }),
  discordArcRoleIds: jsonb("discord_arc_role_ids").$type<string[]>(),
  discordArcRoleNames: jsonb("discord_arc_role_names").$type<string[]>(),
  discordArcPrimaryRoles: jsonb("discord_arc_primary_roles").$type<DiscordArcPrimaryRole[]>(),
  discordArcMembershipCheckedAt: timestamp("discord_arc_membership_checked_at", { withTimezone: true }),

  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
