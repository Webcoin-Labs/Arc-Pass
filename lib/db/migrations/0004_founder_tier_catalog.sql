-- Founder Pass has one small, stable tier catalog. Existing legacy rows are
-- retained for historical credentials but hidden from new admin selections.
INSERT INTO founder_tiers (name, rank, description, is_active)
VALUES
  ('Formal Founder', 2, 'Founders with a confirmed company and verified identity.', true)
ON CONFLICT (name) DO UPDATE SET
  rank = EXCLUDED.rank,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

UPDATE founder_tiers
SET rank = CASE name
    WHEN 'Emerging Founder' THEN 1
    WHEN 'Formal Founder' THEN 2
    WHEN 'Premier Founder' THEN 3
    ELSE rank
  END,
  is_active = CASE
    WHEN name IN ('Emerging Founder', 'Formal Founder', 'Premier Founder') THEN true
    WHEN name IN ('Verified Founder', 'Growth Founder', 'Network Founder') THEN false
    ELSE is_active
  END,
  updated_at = now()
WHERE name IN (
  'Emerging Founder',
  'Formal Founder',
  'Premier Founder',
  'Verified Founder',
  'Growth Founder',
  'Network Founder'
);
