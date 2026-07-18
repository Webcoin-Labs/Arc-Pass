-- Builder tiers are defined exclusively by qualifying Arc transaction count.
-- Restore the published catalog in case an earlier admin edit changed it.
WITH catalog(slug, name, rank, threshold) AS (
  VALUES
    ('bronze', 'Bronze', 1, 2),
    ('silver', 'Silver', 2, 10),
    ('gold', 'Gold', 3, 50),
    ('platinum', 'Platinum', 4, 100),
    ('diamond', 'Diamond', 5, 1000)
)
UPDATE builder_tiers AS tier
SET name = catalog.name,
    rank = catalog.rank,
    transaction_threshold = catalog.threshold,
    contract_threshold = 0,
    is_active = true,
    updated_at = now()
FROM catalog
WHERE tier.slug = catalog.slug;
