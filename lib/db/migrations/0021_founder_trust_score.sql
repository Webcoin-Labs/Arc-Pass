-- Founder Trust Score, 0-100, assigned manually by an administrator.
-- Nullable on purpose: null means "not scored yet", which the pass card renders
-- by omitting the gauge rather than showing a zero.
ALTER TABLE founder_passes
  ADD COLUMN IF NOT EXISTS trust_score integer;

ALTER TABLE founder_passes
  DROP CONSTRAINT IF EXISTS founder_passes_trust_score_range;

ALTER TABLE founder_passes
  ADD CONSTRAINT founder_passes_trust_score_range
  CHECK (trust_score IS NULL OR (trust_score >= 0 AND trust_score <= 100));
