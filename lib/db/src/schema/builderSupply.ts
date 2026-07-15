import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

// Singleton release counter. Lifetime issuance never decreases; revocation
// changes active/revoked counts only and can never make a new slot available.
export const builderSupplyTable = pgTable("builder_supply", {
  id: serial("id").primaryKey(),
  maximumLifetimeSupply: integer("maximum_lifetime_supply").notNull().default(1500),
  lifetimeIssuedCount: integer("lifetime_issued_count").notNull().default(0),
  activeCount: integer("active_count").notNull().default(0),
  revokedCount: integer("revoked_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});
