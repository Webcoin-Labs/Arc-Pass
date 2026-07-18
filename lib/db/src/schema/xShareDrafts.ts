import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Short-lived, user-authorized media draft used only while X redirects through
// OAuth with tweet.write + media.write. The access token is never persisted.
export const xShareDraftsTable = pgTable("x_share_drafts", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  passType: text("pass_type").notNull(),
  passId: integer("pass_id").notNull(),
  mediaType: text("media_type").notNull(),
  mediaBase64: text("media_base64").notNull(),
  postText: text("post_text").notNull(),
  returnTo: text("return_to").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type XShareDraft = typeof xShareDraftsTable.$inferSelect;
