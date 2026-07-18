-- Founder Pass supports exactly two selectable tiers. Historical rows are
-- retained so already-minted, immutable credentials can still render.
INSERT INTO founder_tiers (name, rank, description, is_active)
VALUES
  ('Emerging Founder', 1, 'Early-stage founders building their first verified track record.', true),
  ('Premier Founder', 2, 'Recognized founders with significant ecosystem contribution.', true)
ON CONFLICT (name) DO UPDATE SET
  rank = EXCLUDED.rank,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

-- Safely move every unminted legacy assignment to Emerging Founder. Minted
-- credentials are intentionally untouched because their tier is immutable.
UPDATE founder_passes
SET founder_tier_id = (
  SELECT id FROM founder_tiers WHERE name = 'Emerging Founder'
),
updated_at = now()
WHERE founder_tier_id IS NOT NULL
  AND permanently_locked_at IS NULL
  AND founder_tier_id NOT IN (
    SELECT id FROM founder_tiers WHERE name IN ('Emerging Founder', 'Premier Founder')
  );

UPDATE founder_tiers
SET
  rank = CASE name
    WHEN 'Emerging Founder' THEN 1
    WHEN 'Premier Founder' THEN 2
    ELSE rank
  END,
  is_active = name IN ('Emerging Founder', 'Premier Founder'),
  updated_at = now();
