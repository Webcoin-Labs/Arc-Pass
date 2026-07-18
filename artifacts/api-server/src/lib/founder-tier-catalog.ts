export const FOUNDER_TIER_CATALOG = [
  { name: "Emerging Founder", rank: 1 },
  { name: "Premier Founder", rank: 2 },
] as const;

export type FounderTierCatalogName = (typeof FOUNDER_TIER_CATALOG)[number]["name"];

export const FOUNDER_TIER_NAMES = FOUNDER_TIER_CATALOG.map((tier) => tier.name);

export function getFounderTierCatalogEntry(name: string) {
  return FOUNDER_TIER_CATALOG.find((tier) => tier.name === name);
}

export const FOUNDER_TIER_CATALOG_ERROR =
  "Founder tiers are fixed to Emerging Founder and Premier Founder.";
