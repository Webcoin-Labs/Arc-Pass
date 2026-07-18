import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";

export const founderApplicationsTable = pgTable("founder_applications", {
  id: serial("id").primaryKey(),
  source: text("source").notNull().default("manual"),
  typeformResponseId: text("typeform_response_id").unique(),
  // The in-product request form deliberately collects only a social handle and
  // a short application. Legacy imports may still carry a name.
  fullName: text("full_name"),
  requestXUsername: text("request_x_username").unique(),
  requestIpHash: text("request_ip_hash"),
  workEmail: text("work_email"),
  personalEmail: text("personal_email"),
  xUsername: text("x_username"),
  discordUsername: text("discord_username"),
  companyName: text("company_name"),
  companyWebsite: text("company_website"),
  founderRole: text("founder_role"),
  companyCategory: text("company_category"),
  startupStage: text("startup_stage"),
  description: text("description"),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("under_review"),
  reviewerId: integer("reviewer_id"),
  internalNotes: text("internal_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  rawExternalPayloadReference: jsonb("raw_external_payload_reference"),
}, (table) => [
  index("founder_applications_request_ip_submitted_at_idx").on(table.requestIpHash, table.submittedAt),
]);
