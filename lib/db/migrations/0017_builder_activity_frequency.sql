ALTER TABLE "builder_verification_snapshots"
  ADD COLUMN IF NOT EXISTS "last_transaction_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "transactions_last_30_days" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "active_days_last_30_days" integer NOT NULL DEFAULT 0;
