import { createHash } from "node:crypto";
import sharp from "sharp";
import { findGeneratedArtworkUrl, persistGeneratedArtwork } from "./uploads";
import { absoluteArtworkUrl, artworkImageDataUrl, publicAssetDataUrl } from "./founder-pass-artwork";

const ARTWORK_WIDTH = 1200;
const ARTWORK_HEIGHT = 845;
// Part of the permanent R2 key. Bump whenever the renderer or its runtime
// dependencies change, so stale generated artwork is never reused.
const ARTWORK_VERSION = "builder-card-arc-tier-v1";

export interface BuilderPassArtworkData {
  id: number;
  displayName?: string | null;
  discordUsername?: string | null;
  discordAvatarUrl?: string | null;
  avatarDataUrl?: string | null;
  builderRole?: string | null;
  tierName?: string | null;
  tierEmblemDataUrl?: string | null;
  arcPassLogoDataUrl?: string | null;
  arcNetworkLogoDataUrl?: string | null;
  builderLevel?: number | null;
  validContractCount?: number | null;
  githubContributionCount?: number | null;
  activityScore?: number | null;
  qualifyingTransactionCount?: number | null;
  passNumber?: number | null;
  network?: string | null;
  initiallyIssuedAt?: Date | string | null;
  claimStatus?: string | null;
}

type BuilderTierKey = "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface BuilderTierTheme {
  key: BuilderTierKey;
  cardFrom: string;
  cardTo: string;
  accent: string;
  accentStrong: string;
}

const BUILDER_TIER_THEMES: Record<BuilderTierKey, BuilderTierTheme> = {
  bronze: { key: "bronze", cardFrom: "#5a3324", cardTo: "#241512", accent: "#d18a56", accentStrong: "#ffd0a9" },
  silver: { key: "silver", cardFrom: "#536273", cardTo: "#222b36", accent: "#b6c5d8", accentStrong: "#f0f5fb" },
  gold: { key: "gold", cardFrom: "#624b1c", cardTo: "#291f0c", accent: "#f0bd4e", accentStrong: "#ffe2a1" },
  platinum: { key: "platinum", cardFrom: "#23615e", cardTo: "#112c2d", accent: "#7de0dc", accentStrong: "#d1fffc" },
  diamond: { key: "diamond", cardFrom: "#3155a0", cardTo: "#14214a", accent: "#9eb4ff", accentStrong: "#e1e8ff" },
};

function resolveTierTheme(tierName: string | null | undefined): BuilderTierTheme {
  const normalized = tierName?.toLowerCase().replace(/\s+/g, "") ?? "";
  const key = normalized === "golden" ? "gold" : normalized;
  return key in BUILDER_TIER_THEMES ? BUILDER_TIER_THEMES[key as BuilderTierKey] : BUILDER_TIER_THEMES.silver;
}

const artworkJobs = new Map<string, Promise<string>>();
let builderBrandAssetsPromise: Promise<BuilderPassBrandAssets> | null = null;

interface BuilderPassBrandAssets {
  arcPassLogoDataUrl: string;
  arcNetworkLogoDataUrl: string;
  tierEmblemDataUrls: Record<BuilderTierKey, string>;
}

export async function loadBuilderPassBrandAssets(): Promise<BuilderPassBrandAssets> {
  builderBrandAssetsPromise ??= (async () => {
    const [arcPassLogoDataUrl, arcNetworkLogoDataUrl, bronze, silver, gold, platinum, diamond] = await Promise.all([
      publicAssetDataUrl("brand/arc-pass-logo.webp", 420),
      publicAssetDataUrl("logo/Arc_Logo_White.svg", 180),
      publicAssetDataUrl("tiers/bronze.png", 128),
      publicAssetDataUrl("tiers/silver.png", 128),
      publicAssetDataUrl("tiers/gold.png", 128),
      publicAssetDataUrl("tiers/platinum.png", 128),
      publicAssetDataUrl("tiers/diamond.png", 128),
    ]);
    return { arcPassLogoDataUrl, arcNetworkLogoDataUrl, tierEmblemDataUrls: { bronze, silver, gold, platinum, diamond } };
  })();
  return builderBrandAssetsPromise;
}

function escapeXml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]!);
}

function displayText(value: unknown, fallback: string, maximumLength: number): string {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
  return normalized.length > maximumLength ? `${normalized.slice(0, maximumLength - 1)}…` : normalized;
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formattedIssueDate(data: BuilderPassArtworkData): string {
  const date = asDate(data.initiallyIssuedAt);
  return date
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date)
    : "Assigned after claim";
}

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function statNumber(value: number | null | undefined): string {
  return typeof value === "number" ? value.toLocaleString() : "—";
}

function passNumberLabel(passNumber: number | null | undefined): string {
  return typeof passNumber === "number" ? `#${String(passNumber).padStart(4, "0")}` : "Assigned after claim";
}

export function buildBuilderPassSvg(data: BuilderPassArtworkData): string {
  const theme = resolveTierTheme(data.tierName);
  const builderName = displayText(data.displayName, "Builder identity pending", 26);
  const username = displayText(data.discordUsername, "", 30);
  const role = data.builderRole ? displayText(data.builderRole, "", 34) : "";
  const tierLabel = displayText(data.tierName, "Tier pending", 18).toUpperCase();
  const network = displayText(data.network, "Arc", 14).toLowerCase() === "arc" ? "Arc" : displayText(data.network, "Arc", 14);
  const level = typeof data.builderLevel === "number" ? String(data.builderLevel) : "--";
  const isMinted = data.claimStatus === "minted";
  const accent = theme.accent;
  const accentStrong = theme.accentStrong;

  const arcPassLogo = data.arcPassLogoDataUrl
    ? `<image href="${escapeXml(data.arcPassLogoDataUrl)}" x="60" y="48" width="264" height="100" preserveAspectRatio="xMinYMid meet"/>`
    : `<text x="60" y="112" fill="white" font-size="38" font-weight="700">Arc Pass</text>`;

  const tierEmblem = data.tierEmblemDataUrl
    ? `<image href="${escapeXml(data.tierEmblemDataUrl)}" x="722" y="270" width="108" height="108" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="776" cy="324" r="46" fill="none" stroke="${accent}" stroke-width="3"/>`;

  const blockchainIdentity = network === "Arc" && data.arcNetworkLogoDataUrl
    ? `<image href="${escapeXml(data.arcNetworkLogoDataUrl)}" x="360" y="731" width="104" height="36" preserveAspectRatio="xMinYMid meet"/>`
    : `<text x="360" y="760" class="meta-value">${escapeXml(network)}</text>`;

  const avatarNode = data.avatarDataUrl
    ? `<image href="${escapeXml(data.avatarDataUrl)}" x="60" y="250" width="140" height="140" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatar)"/>`
    : `<text x="130" y="338" text-anchor="middle" fill="${accentStrong}" font-size="52" font-weight="700">${escapeXml(initials(builderName))}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ARTWORK_WIDTH}" height="${ARTWORK_HEIGHT}" viewBox="0 0 ${ARTWORK_WIDTH} ${ARTWORK_HEIGHT}">
  <defs>
    <linearGradient id="card-background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.cardFrom}"/>
      <stop offset="1" stop-color="${theme.cardTo}"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0" cy="0" r="1" gradientTransform="translate(984 24) rotate(122) scale(560 620)">
      <stop stop-color="${accentStrong}" stop-opacity="0.30"/>
      <stop offset="1" stop-color="${accentStrong}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="topline" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="${accentStrong}" stop-opacity="0"/>
      <stop offset="0.5" stop-color="${accentStrong}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${accentStrong}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="card-clip"><rect width="1200" height="845" rx="34"/></clipPath>
    <clipPath id="avatar"><circle cx="130" cy="320" r="70"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#02060f" flood-opacity="0.4"/></filter>
    <style>
      /* DejaVu is installed in Railway through railpack.json, making Sharp's
         server renderer deterministic rather than relying on host fonts. */
      text { font-family: "DejaVu Sans", Arial, sans-serif; }
      .eyebrow { fill: #ffffff; fill-opacity: .5; font-family: "DejaVu Sans Mono", "DejaVu Sans", monospace; font-size: 13px; font-weight: 700; letter-spacing: 2.5px; }
      .builder-name { fill: white; font-size: 42px; font-weight: 700; letter-spacing: -1px; }
      .builder-username { fill: white; fill-opacity: .5; font-family: "DejaVu Sans Mono", "DejaVu Sans", monospace; font-size: 18px; }
      .builder-role { font-size: 19px; font-weight: 600; }
      .stat-label { fill: white; fill-opacity: .46; font-family: "DejaVu Sans Mono", "DejaVu Sans", monospace; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; }
      .stat-value { fill: white; font-size: 34px; font-weight: 700; }
      .meta-label { fill: white; fill-opacity: .4; font-family: "DejaVu Sans Mono", "DejaVu Sans", monospace; font-size: 13px; font-weight: 700; letter-spacing: 2px; }
      .meta-value { fill: white; fill-opacity: .9; font-size: 19px; font-weight: 700; }
    </style>
  </defs>

  <g filter="url(#shadow)">
    <rect width="1200" height="845" rx="34" fill="url(#card-background)"/>
    <g clip-path="url(#card-clip)">
      <rect width="1200" height="845" fill="url(#sheen)"/>
      <circle cx="1120" cy="-70" r="240" fill="none" stroke="${accent}" stroke-opacity="0.18" stroke-width="2"/>
      <circle cx="1120" cy="-70" r="170" fill="none" stroke="${accent}" stroke-opacity="0.14" stroke-width="2"/>
      <rect x="0" y="0" width="6" height="845" fill="${accent}"/>
      <rect x="0" y="0" width="1200" height="3" fill="url(#topline)"/>
    </g>
    <rect x="1" y="1" width="1198" height="843" rx="33" fill="none" stroke="${accent}" stroke-opacity="0.6" stroke-width="2"/>
  </g>

  <g aria-label="Arc Pass logo">${arcPassLogo}</g>

  <text x="1140" y="66" text-anchor="end" fill="${accentStrong}" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="15" font-weight="700" letter-spacing="4">BUILDER PASS</text>
  <g transform="translate(902 84)">
    <rect width="238" height="54" rx="27" fill="#04070f" fill-opacity="0.55" stroke="${accent}" stroke-opacity="0.7"/>
    <path d="M28 27 39 22l11 5v9c0 9-6 15-11 17-5-2-11-8-11-17v-9Z" fill="none" stroke="${accentStrong}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="m34 36 4 4 7-9" fill="none" stroke="${accentStrong}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="70" y="34" fill="${accentStrong}" font-size="16" font-weight="700" letter-spacing="1.5">WORK VERIFIED</text>
  </g>

  <g aria-label="Cardholder">
    <circle cx="130" cy="320" r="70" fill="#050a16" fill-opacity="0.5" stroke="${accent}" stroke-opacity="0.5" stroke-width="2"/>
    ${avatarNode}
    <text x="235" y="272" class="eyebrow">CARDHOLDER</text>
    <text x="235" y="322" class="builder-name">${escapeXml(builderName)}</text>
    ${username ? `<text x="235" y="353" class="builder-username">${escapeXml(username)}</text>` : ""}
    ${role ? `<text x="235" y="${username ? 383 : 353}" class="builder-role" fill="${accentStrong}">${escapeXml(role)}</text>` : ""}
  </g>

  <g aria-label="Tier">
    <rect x="695" y="240" width="445" height="176" rx="28" fill="#04070f" fill-opacity="0.4" stroke="${accent}" stroke-opacity="0.42"/>
    <text x="726" y="278" class="eyebrow">TIER</text>
    ${tierEmblem}
    <text x="852" y="312" fill="${accentStrong}" font-size="30" font-weight="700">${escapeXml(tierLabel)}</text>
    <text x="852" y="344" fill="white" fill-opacity="0.56" font-size="16">Verified contribution</text>
    <g transform="translate(852 366)">
      <rect width="66" height="34" rx="8" fill="#04070f" fill-opacity="0.7" stroke="${accent}" stroke-opacity="0.6"/>
      <text x="12" y="23" fill="${accentStrong}" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="12" font-weight="700">LVL</text>
      <text x="82" y="26" fill="${accentStrong}" font-size="28" font-weight="700">${escapeXml(level)}</text>
      <text x="${level.length > 2 ? 150 : 132}" y="26" fill="white" fill-opacity="0.55" font-size="16">${escapeXml(typeof data.qualifyingTransactionCount === "number" ? `· ${data.qualifyingTransactionCount} tx` : "")}</text>
    </g>
  </g>

  <g aria-label="Stats" transform="translate(60 470)">
    <rect x="0" y="0" width="346" height="120" rx="22" fill="#04070f" fill-opacity="0.36" stroke="${accent}" stroke-opacity="0.28"/>
    <rect x="367" y="0" width="346" height="120" rx="22" fill="#04070f" fill-opacity="0.36" stroke="${accent}" stroke-opacity="0.28"/>
    <rect x="734" y="0" width="346" height="120" rx="22" fill="#04070f" fill-opacity="0.36" stroke="${accent}" stroke-opacity="0.28"/>
    <text x="30" y="46" class="stat-label">CONTRACTS DEPLOYED</text>
    <text x="30" y="92" class="stat-value">${escapeXml(statNumber(data.validContractCount))}</text>
    <text x="397" y="46" class="stat-label">GITHUB CONTRIBUTIONS</text>
    <text x="397" y="92" class="stat-value">${escapeXml(statNumber(data.githubContributionCount))}</text>
    <text x="764" y="46" class="stat-label">ACTIVITY SCORE</text>
    <text x="764" y="92" class="stat-value">${escapeXml(statNumber(data.activityScore))}<tspan fill="#ffffff" fill-opacity="0.35" font-size="18" font-weight="600"> /100</tspan></text>
  </g>

  <line x1="60" y1="640" x2="1140" y2="640" stroke="${accent}" stroke-opacity="0.24"/>

  <g transform="translate(60 0)" aria-label="Record">
    <text x="0" y="700" class="meta-label">PASS</text>
    <text x="0" y="737" class="meta-value">${escapeXml(passNumberLabel(data.passNumber))}</text>
    <text x="300" y="700" class="meta-label">NETWORK</text>
    ${blockchainIdentity}
    <text x="600" y="700" class="meta-label">ISSUE DATE</text>
    <text x="600" y="737" class="meta-value">${escapeXml(formattedIssueDate(data))}</text>
    <text x="900" y="700" class="meta-label">ONCHAIN</text>
    <text x="900" y="737" fill="${isMinted ? "#77f2bd" : "#ffffff"}" fill-opacity="${isMinted ? 1 : 0.9}" font-size="19" font-weight="700">${isMinted ? "Recorded" : "Pending"}</text>
  </g>

  <g transform="translate(60 785)">
    <circle cx="14" cy="18" r="6" fill="#79a68d"/>
    <circle cx="14" cy="18" r="12" fill="#79a68d" fill-opacity="0.14"/>
    <text x="40" y="15" fill="white" fill-opacity="0.9" font-size="17" font-weight="700">Verified by Webcoin Labs</text>
    <text x="40" y="38" fill="white" fill-opacity="0.5" font-size="14">Identity and activity record</text>
    <text x="1080" y="14" text-anchor="end" fill="white" fill-opacity="0.45" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="12" font-weight="700" letter-spacing="2">SOULBOUND</text>
    <text x="1080" y="39" text-anchor="end" fill="white" fill-opacity="0.9" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="15" font-weight="700" letter-spacing="2">NON-TRANSFERABLE</text>
  </g>
</svg>`;
}

export async function renderBuilderPassArtwork(data: BuilderPassArtworkData): Promise<Buffer> {
  const brand = await loadBuilderPassBrandAssets();
  const theme = resolveTierTheme(data.tierName);
  const merged: BuilderPassArtworkData = {
    ...data,
    arcPassLogoDataUrl: brand.arcPassLogoDataUrl,
    arcNetworkLogoDataUrl: brand.arcNetworkLogoDataUrl,
    tierEmblemDataUrl: brand.tierEmblemDataUrls[theme.key],
  };
  return sharp(Buffer.from(buildBuilderPassSvg(merged)), { density: 144, failOn: "error" })
    .resize(ARTWORK_WIDTH, ARTWORK_HEIGHT, { fit: "fill" })
    .webp({ quality: 92, alphaQuality: 95, effort: 5 })
    .toBuffer();
}

function artworkObjectKey(data: BuilderPassArtworkData): string {
  if (!Number.isSafeInteger(data.id) || data.id <= 0) throw new Error("Builder pass ID must be a positive integer");
  const fingerprint = createHash("sha256").update(JSON.stringify({
    version: ARTWORK_VERSION,
    id: data.id,
    displayName: data.displayName ?? null,
    discordUsername: data.discordUsername ?? null,
    discordAvatarUrl: data.discordAvatarUrl ?? null,
    builderRole: data.builderRole ?? null,
    tierName: data.tierName ?? null,
    builderLevel: data.builderLevel ?? null,
    validContractCount: data.validContractCount ?? null,
    githubContributionCount: data.githubContributionCount ?? null,
    activityScore: data.activityScore ?? null,
    qualifyingTransactionCount: data.qualifyingTransactionCount ?? null,
    passNumber: data.passNumber ?? null,
    network: data.network ?? null,
    initiallyIssuedAt: asDate(data.initiallyIssuedAt)?.toISOString() ?? null,
    claimStatus: data.claimStatus ?? null,
  })).digest("hex").slice(0, 16);
  return `passes/builder/${data.id}-${fingerprint}.webp`;
}

export async function ensureBuilderPassArtwork(data: BuilderPassArtworkData, appUrl: string): Promise<string> {
  const objectKey = artworkObjectKey(data);
  let job = artworkJobs.get(objectKey);
  if (!job) {
    job = (async () => {
      const existing = await findGeneratedArtworkUrl(objectKey);
      if (existing) return existing;
      const avatarDataUrl = await artworkImageDataUrl(data.discordAvatarUrl);
      const artwork = await renderBuilderPassArtwork({ ...data, avatarDataUrl });
      return persistGeneratedArtwork(objectKey, artwork);
    })();
    artworkJobs.set(objectKey, job);
  }

  try {
    return absoluteArtworkUrl(await job, appUrl);
  } finally {
    if (artworkJobs.get(objectKey) === job) artworkJobs.delete(objectKey);
  }
}
