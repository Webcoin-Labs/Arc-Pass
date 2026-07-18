-- Wave allocations are consumed by confirmed original Builder mints, not by
-- offchain inventory claims. This timestamp protects the final available slots
-- while the external onchain mint transaction is being submitted. Reservations
-- intentionally do not auto-expire: expiring a slow, still-pending transaction
-- could over-allocate the final slot. Operational reconciliation must inspect
-- the transaction before clearing a stranded reservation.
ALTER TABLE builder_passes
  ADD COLUMN IF NOT EXISTS wave_mint_reserved_at timestamptz;

CREATE INDEX IF NOT EXISTS builder_passes_wave_mint_reserved_idx
  ON builder_passes (wave_mint_reserved_at)
  WHERE wave_mint_reserved_at IS NOT NULL;

-- GitHub Builder eligibility needs a verifiable account age and a bounded
-- 180-day contribution window. Older annual snapshots are not equivalent.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS github_account_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS github_contribution_window_started_at timestamptz;

UPDATE builder_tiers
SET transaction_threshold = CASE slug
      WHEN 'bronze' THEN 2 WHEN 'silver' THEN 10 WHEN 'gold' THEN 50
      WHEN 'platinum' THEN 100 WHEN 'diamond' THEN 1000
      ELSE transaction_threshold END,
    contract_threshold = 0,
    description = CASE slug
      WHEN 'bronze' THEN '2+ verified qualifying Arc transactions.'
      WHEN 'silver' THEN '10+ verified qualifying Arc transactions.'
      WHEN 'gold' THEN '50+ verified qualifying Arc transactions.'
      WHEN 'platinum' THEN '100+ verified qualifying Arc transactions.'
      WHEN 'diamond' THEN '1,000+ verified qualifying Arc transactions.'
      ELSE description END
WHERE slug IN ('bronze', 'silver', 'gold', 'platinum', 'diamond');
