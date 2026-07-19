ALTER TABLE founder_passes
  ADD COLUMN IF NOT EXISTS mint_reserved_at timestamptz;
