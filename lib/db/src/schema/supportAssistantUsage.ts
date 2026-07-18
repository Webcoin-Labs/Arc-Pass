import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * A privacy-preserving, per-network rate-limit ledger for the public support
 * assistant. `visitorKey` is an HMAC fingerprint, never a raw IP address.
 */
export const supportAssistantUsageTable = pgTable("support_assistant_usage", {
  visitorKey: text("visitor_key").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  responseCount: integer("response_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
