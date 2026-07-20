-- Keep the persisted tier catalog copy aligned with the dual-signal policy.
-- Arc thresholds remain columns on builder_tiers; GitHub contribution and
-- account-age thresholds are deterministic application policy.
WITH catalog(slug, description) AS (
  VALUES
    ('bronze', '2+ Arc transactions OR 10+ GitHub contributions with a 180-day-old account.'),
    ('silver', '10+ Arc transactions OR 250+ GitHub contributions with a 1-year-old account.'),
    ('gold', '50+ Arc transactions OR 750+ GitHub contributions with a 2-year-old account.'),
    ('platinum', '100+ Arc transactions OR 1,500+ GitHub contributions with a 3-year-old account.'),
    ('diamond', '1,000+ Arc transactions OR 3,000+ GitHub contributions with a 4-year-old account.')
)
UPDATE builder_tiers AS tier
SET description = catalog.description,
    updated_at = now()
FROM catalog
WHERE tier.slug = catalog.slug;
