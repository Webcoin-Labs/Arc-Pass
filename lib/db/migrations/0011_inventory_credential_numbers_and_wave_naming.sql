-- Inventory claims receive stable credential numbers before an optional
-- onchain mint. Backfill older claimed rows that predate claim-time numbering.
WITH founder_numbering AS (
  SELECT
    id,
    (SELECT COALESCE(MAX(pass_number), 0) FROM founder_passes)
      + ROW_NUMBER() OVER (ORDER BY COALESCE(claimed_at, created_at), id) AS assigned_number
  FROM founder_passes
  WHERE pass_number IS NULL
    AND claim_status IN ('claimed', 'minted')
)
UPDATE founder_passes AS pass
SET pass_number = founder_numbering.assigned_number,
    updated_at = now()
FROM founder_numbering
WHERE pass.id = founder_numbering.id;

WITH builder_numbering AS (
  SELECT
    id,
    (SELECT COALESCE(MAX(pass_number), 0) FROM builder_passes)
      + ROW_NUMBER() OVER (ORDER BY COALESCE(initially_issued_at, created_at), id) AS assigned_number
  FROM builder_passes
  WHERE pass_number IS NULL
    AND claim_status IN ('claimed', 'minted')
)
UPDATE builder_passes AS pass
SET pass_number = builder_numbering.assigned_number,
    updated_at = now()
FROM builder_numbering
WHERE pass.id = builder_numbering.id;

-- Historical migrations used "Phase 1". Keep persisted operational data and
-- future defaults aligned with the current Wave 1 product language.
ALTER TABLE builder_supply
  ALTER COLUMN phase_name SET DEFAULT 'Wave 1';

UPDATE builder_supply
SET phase_name = 'Wave 1',
    updated_at = now()
WHERE lower(phase_name) IN ('phase 1', 'phase one');
