DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'builder_supply' AND column_name = 'maximum_lifetime_supply'
  ) THEN
    ALTER TABLE builder_supply RENAME COLUMN maximum_lifetime_supply TO phase_claim_limit;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'builder_supply' AND column_name = 'lifetime_issued_count'
  ) THEN
    ALTER TABLE builder_supply RENAME COLUMN lifetime_issued_count TO total_claimed_count;
  END IF;
END $$;

ALTER TABLE builder_supply
  ADD COLUMN IF NOT EXISTS phase_name text NOT NULL DEFAULT 'Phase 1',
  ADD COLUMN IF NOT EXISTS total_minted_count integer NOT NULL DEFAULT 0;

ALTER TABLE builder_supply ALTER COLUMN phase_claim_limit SET DEFAULT 2000;

UPDATE builder_supply SET
  phase_name = 'Phase 1',
  phase_claim_limit = GREATEST(phase_claim_limit, 2000),
  total_claimed_count = (SELECT count(*) FROM builder_passes WHERE claim_status IN ('claimed', 'minted')),
  total_minted_count = (SELECT count(*) FROM builder_passes WHERE claim_status = 'minted'),
  active_count = (SELECT count(*) FROM builder_passes WHERE claim_status = 'minted' AND NOT is_revoked),
  revoked_count = (SELECT count(*) FROM builder_passes WHERE claim_status = 'minted' AND is_revoked),
  updated_at = now()
WHERE id = 1;
