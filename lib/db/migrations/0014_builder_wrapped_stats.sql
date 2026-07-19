ALTER TABLE builder_verification_snapshots
  ADD COLUMN IF NOT EXISTS usdc_spent text,
  ADD COLUMN IF NOT EXISTS eurc_spent text,
  ADD COLUMN IF NOT EXISTS first_transaction_at timestamptz;
