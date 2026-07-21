import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  findGeneratedArtworkUrl,
  normalizeUploadedImageUrl,
  persistGeneratedArtwork,
  readStoredImage,
} from "./uploads";

const ARTWORK_WIDTH = 1200;
const ARTWORK_HEIGHT = 845;
// This value is part of the permanent R2 key. Bump it whenever the renderer
// or its runtime dependencies change, so stale generated artwork is not reused.
const ARTWORK_VERSION = "founder-card-arc-aurora-v4-runtime-fonts";
const MAX_EMBEDDED_IMAGE_BYTES = 5 * 1024 * 1024;
const REMOTE_IMAGE_HOSTS = new Set([
  "abs.twimg.com",
  "avatars.githubusercontent.com",
  "cdn.discordapp.com",
  "media.discordapp.net",
  "pbs.twimg.com",
]);

export interface FounderPassArtworkData {
  id: number;
  variant: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  avatarDataUrl?: string | null;
  founderTitle?: string | null;
  companyName?: string | null;
  companyIndustry?: string | null;
  companyLogoUrl?: string | null;
  companyLogoDataUrl?: string | null;
  arcPassLogoDataUrl?: string | null;
  arcNetworkLogoDataUrl?: string | null;
  premierEmblemDataUrl?: string | null;
  emergingEmblemDataUrl?: string | null;
  tierName?: string | null;
  passNumber?: number | null;
  network?: string | null;
  issuedAt?: Date | string | null;
  claimedAt?: Date | string | null;
  eligibilityStatus?: string | null;
  claimStatus?: string | null;
}

const artworkJobs = new Map<string, Promise<string>>();
let founderBrandAssetsPromise: Promise<FounderPassBrandAssets> | null = null;

interface FounderPassBrandAssets {
  arcPassLogoDataUrl: string;
  arcNetworkLogoDataUrl: string;
  premierEmblemDataUrl: string;
  emergingEmblemDataUrl: string;
}

function publicAssetCandidates(relativePath: string): string[] {
  const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
  return [
    path.resolve(moduleDirectory, "../../../arc-pass/public", relativePath),
    path.resolve(moduleDirectory, "../../arc-pass/public", relativePath),
    path.resolve(process.cwd(), "../arc-pass/public", relativePath),
    path.resolve(process.cwd(), "artifacts/arc-pass/public", relativePath),
  ];
}

async function readPublicAsset(relativePath: string): Promise<Buffer> {
  for (const candidate of publicAssetCandidates(relativePath)) {
    try { return await readFile(candidate); } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  throw new Error(`Required Founder artwork asset is missing: ${relativePath}`);
}

export async function publicAssetDataUrl(relativePath: string, width: number): Promise<string> {
  const source = await readPublicAsset(relativePath);
  const png = await sharp(source, { density: 288, failOn: "error" })
    .resize({ width, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function loadFounderPassBrandAssets(): Promise<FounderPassBrandAssets> {
  founderBrandAssetsPromise ??= (async () => {
    const [arcPassLogoDataUrl, arcNetworkLogoDataUrl, premierEmblemDataUrl, emergingEmblemDataUrl] = await Promise.all([
      publicAssetDataUrl("brand/arc-pass-logo.webp", 420),
      publicAssetDataUrl("logo/Arc_Logo_White.svg", 180),
      publicAssetDataUrl("logo/premierfounderpass.webp", 64),
      publicAssetDataUrl("logo/emergingfounder.webp", 64),
    ]);
    return { arcPassLogoDataUrl, arcNetworkLogoDataUrl, premierEmblemDataUrl, emergingEmblemDataUrl };
  })();
  return founderBrandAssetsPromise;
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

function issueDate(data: FounderPassArtworkData): Date | null {
  return asDate(data.issuedAt) ?? asDate(data.claimedAt);
}

function formattedIssueDate(data: FounderPassArtworkData): string {
  const date = issueDate(data);
  return date
    ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date)
    : "Assigned after claim";
}

function credentialId(data: FounderPassArtworkData): string {
  if (!data.passNumber) return "ASSIGNED AFTER CLAIM";
  const year = issueDate(data)?.getUTCFullYear() ?? new Date().getUTCFullYear();
  return `ARC-FND-${year}-${String(data.passNumber).padStart(4, "0")}`;
}

function statusLabel(data: FounderPassArtworkData): string {
  if (data.claimStatus === "minted") return "Onchain";
  if (data.claimStatus === "claimed") return "Claimed";
  if (data.eligibilityStatus === "eligible") return "Eligible";
  return "Invite only";
}

function variantLabel(data: FounderPassArtworkData): string {
  return displayText(data.tierName, data.variant === "premium_black" ? "Premier Founder" : "Emerging Founder", 26).toUpperCase();
}

function initials(value: string): string {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function embeddedImage(dataUrl: string | null | undefined, clipId: string, x: number, y: number, width: number, height: number): string {
  if (!dataUrl) return "";
  return `<image href="${escapeXml(dataUrl)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})"/>`;
}

function backgroundMarkup(isPremium: boolean): string {
  if (isPremium) {
    return `
      <linearGradient id="card-background" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#071b64"/>
        <stop offset="0.42" stop-color="#123d9d"/>
        <stop offset="0.72" stop-color="#8498df"/>
        <stop offset="1" stop-color="#e6b7d2"/>
      </linearGradient>
      <radialGradient id="lower-glow" cx="0" cy="0" r="1" gradientTransform="translate(292 758) rotate(-20) scale(560 390)">
        <stop stop-color="#e4ddff" stop-opacity="0.9"/>
        <stop offset="1" stop-color="#e4ddff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="pink-glow" cx="0" cy="0" r="1" gradientTransform="translate(1040 780) rotate(-150) scale(500 320)">
        <stop stop-color="#f3c1d8" stop-opacity="0.78"/>
        <stop offset="1" stop-color="#f3c1d8" stop-opacity="0"/>
      </radialGradient>`;
  }
  return `
    <linearGradient id="card-background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#071652"/>
      <stop offset="0.55" stop-color="#12358e"/>
      <stop offset="1" stop-color="#174fc4"/>
    </linearGradient>
    <radialGradient id="lower-glow" cx="0" cy="0" r="1" gradientTransform="translate(230 760) rotate(-20) scale(520 340)">
      <stop stop-color="#2c74ff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#2c74ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="pink-glow"><stop stop-color="#174fc4" stop-opacity="0"/></radialGradient>`;
}

export function buildFounderPassSvg(data: FounderPassArtworkData): string {
  const isPremium = data.variant === "premium_black";
  const founderName = displayText(data.displayName, "Founder identity", 28);
  const founderTitle = displayText(data.founderTitle, "Founder title not provided", 36);
  const username = displayText(data.username, "", 28).replace(/^@/, "");
  const companyName = data.companyName ? displayText(data.companyName, "", 30) : "";
  const companyIndustry = data.companyIndustry ? displayText(data.companyIndustry, "", 38) : "";
  const tier = variantLabel(data);
  const network = displayText(data.network, "Arc", 14).toLowerCase() === "arc" ? "Arc" : displayText(data.network, "Arc", 14);
  const border = isPremium ? "#e0b768" : "#6ea0ff";
  const tierText = isPremium ? "#f6d38a" : "#e4edff";
  const tierFill = isPremium ? "#25160c" : "#09266e";
  const tierEmblemDataUrl = isPremium ? data.premierEmblemDataUrl : data.emergingEmblemDataUrl;
  const arcPassLogo = data.arcPassLogoDataUrl
    ? `<image href="${escapeXml(data.arcPassLogoDataUrl)}" x="60" y="48" width="276" height="104" preserveAspectRatio="xMinYMid meet"/>`
    : `<path d="M65 98C67 72 84 57 108 57s41 15 43 41h-19c-3-14-12-22-24-22s-21 8-24 22H65Z" fill="#378cff"/><text x="168" y="97" fill="white" font-size="38" font-weight="700">Arc Pass</text>`;
  const tierEmblem = tierEmblemDataUrl
    ? `<image href="${escapeXml(tierEmblemDataUrl)}" x="18" y="11" width="34" height="34" preserveAspectRatio="xMidYMid meet"/>`
    : `<path d="M22 34 16 22l10 6 9-12 9 12 10-6-6 12H22Z" fill="none" stroke="${tierText}" stroke-width="2.2" stroke-linejoin="round"/>`;
  const blockchainIdentity = network === "Arc" && data.arcNetworkLogoDataUrl
    ? `<g aria-label="Arc network"><image href="${escapeXml(data.arcNetworkLogoDataUrl)}" x="395" y="555" width="106" height="37" preserveAspectRatio="xMinYMid meet"/></g>`
    : `<g aria-label="Arc network"><path d="M395 586c2-19 14-30 31-30s29 11 31 30h-13c-2-10-8-16-18-16s-16 6-18 16h-13Z" fill="white"/><text x="470" y="584" class="field-value">${escapeXml(network)}</text></g>`;
  const companyPanel = companyName ? `
    <g aria-label="Company">
      <rect x="695" y="240" width="445" height="168" rx="28" fill="#06194f" fill-opacity="0.32" stroke="#bed0ff" stroke-opacity="0.42"/>
      <text x="730" y="278" class="eyebrow">COMPANY</text>
      <circle cx="780" cy="334" r="43" fill="#061c58" stroke="#aac2ff" stroke-opacity="0.45"/>
      ${embeddedImage(data.companyLogoDataUrl, "company-logo", 737, 291, 86, 86)}
      ${data.companyLogoDataUrl ? "" : `<text x="780" y="345" text-anchor="middle" class="company-initials">${escapeXml(initials(companyName))}</text>`}
      <text x="850" y="331" class="company-name">${escapeXml(companyName)}</text>
      ${companyIndustry ? `<text x="850" y="361" class="company-detail">${escapeXml(companyIndustry)}</text>` : ""}
    </g>` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ARTWORK_WIDTH}" height="${ARTWORK_HEIGHT}" viewBox="0 0 ${ARTWORK_WIDTH} ${ARTWORK_HEIGHT}">
  <defs>
    ${backgroundMarkup(isPremium)}
    <clipPath id="card-clip"><rect width="1200" height="845" rx="34"/></clipPath>
    <clipPath id="avatar"><rect x="60" y="248" width="142" height="142" rx="30"/></clipPath>
    <clipPath id="company-logo"><circle cx="780" cy="334" r="43"/></clipPath>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#00113e" flood-opacity="0.35"/></filter>
    <style>
      /* DejaVu is installed in Railway through railpack.json. It makes Sharp's
         server renderer deterministic rather than relying on host fonts. */
      text { font-family: "DejaVu Sans", Arial, sans-serif; }
      .eyebrow { fill: #d6e0ff; fill-opacity: .68; font-family: "DejaVu Sans Mono", "DejaVu Sans", monospace; font-size: 14px; font-weight: 700; letter-spacing: 3px; }
      .founder-name { fill: white; font-size: 42px; font-weight: 700; letter-spacing: -1px; }
      .founder-title { fill: white; fill-opacity: .68; font-size: 19px; font-weight: 600; }
      .social { fill: white; fill-opacity: .64; font-size: 17px; font-weight: 600; }
      .company-name { fill: white; font-size: 28px; font-weight: 700; }
      .company-detail { fill: white; fill-opacity: .62; font-size: 16px; }
      .company-initials { fill: white; font-size: 24px; font-weight: 700; }
      .field-label { fill: white; fill-opacity: .42; font-family: "DejaVu Sans Mono", "DejaVu Sans", monospace; font-size: 13px; font-weight: 700; letter-spacing: 2px; }
      .field-value { fill: white; fill-opacity: .92; font-size: 19px; font-weight: 700; }
      .credential-value { fill: white; fill-opacity: .94; font-family: "DejaVu Sans Mono", "DejaVu Sans", monospace; font-size: 18px; font-weight: 700; }
    </style>
  </defs>
  <g filter="url(#shadow)">
    <rect width="1200" height="845" rx="34" fill="url(#card-background)"/>
    <g clip-path="url(#card-clip)">
      <rect width="1200" height="845" fill="url(#lower-glow)"/>
      <rect width="1200" height="845" fill="url(#pink-glow)"/>
      <path d="M0 0H1200V845H0Z" fill="url(#card-background)" opacity="0.08"/>
      <circle cx="1065" cy="-86" r="320" fill="none" stroke="${border}" stroke-opacity="0.33" stroke-width="2"/>
      <circle cx="1065" cy="-86" r="245" fill="none" stroke="${border}" stroke-opacity="0.23" stroke-width="2"/>
      <rect x="0" y="0" width="4" height="845" fill="#6ea0ff"/>
    </g>
    <rect x="1" y="1" width="1198" height="843" rx="33" fill="none" stroke="${border}" stroke-opacity="0.64" stroke-width="2"/>
  </g>

  <g aria-label="Arc Pass logo">${arcPassLogo}</g>

  <text x="1140" y="66" text-anchor="end" fill="${tierText}" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="15" font-weight="700" letter-spacing="4">FOUNDER PASS</text>
  <g transform="translate(850 84)">
    <rect width="290" height="54" rx="27" fill="${tierFill}" fill-opacity="0.72" stroke="${border}" stroke-opacity="0.75"/>
    ${tierEmblem}
    <text x="66" y="34" fill="${tierText}" font-size="17" font-weight="700" letter-spacing="2">${escapeXml(tier)}</text>
  </g>

  <g aria-label="Cardholder">
    <rect x="60" y="248" width="142" height="142" rx="30" fill="#092b7d" fill-opacity="0.58" stroke="#b7caff" stroke-opacity="0.48" stroke-width="2"/>
    ${embeddedImage(data.avatarDataUrl, "avatar", 60, 248, 142, 142)}
    ${data.avatarDataUrl ? "" : `<circle cx="131" cy="298" r="21" fill="none" stroke="#dce5ff" stroke-opacity="0.72" stroke-width="5"/><path d="M92 368c5-32 20-48 39-48s34 16 39 48" fill="none" stroke="#dce5ff" stroke-opacity="0.72" stroke-width="5" stroke-linecap="round"/>`}
    <rect x="60" y="385" width="142" height="5" rx="2.5" fill="#83a9ff"/>
    <text x="235" y="270" class="eyebrow">CARDHOLDER</text>
    <text x="235" y="320" class="founder-name">${escapeXml(founderName)}</text>
    <text x="235" y="353" class="founder-title">${escapeXml(founderTitle)}</text>
    ${username ? `<circle cx="246" cy="382" r="12" fill="white" fill-opacity="0.92"/><path d="m239 375 14 14m0-14-14 14" stroke="#05070d" stroke-width="2"/><text x="267" y="388" class="social">@${escapeXml(username)}</text>` : ""}
  </g>
  ${companyPanel}

  <line x1="60" y1="505" x2="1140" y2="505" stroke="#c4d2ff" stroke-opacity="0.30"/>
  <line x1="60" y1="651" x2="1140" y2="651" stroke="#c4d2ff" stroke-opacity="0.30"/>

  <g transform="translate(60 0)">
    <text x="0" y="548" class="field-label">CREDENTIAL</text>
    <text x="0" y="585" class="credential-value">${escapeXml(credentialId(data))}</text>
    <text x="395" y="548" class="field-label">BLOCKCHAIN</text>
    ${blockchainIdentity}
    <text x="650" y="548" class="field-label">ISSUE DATE</text>
    <text x="650" y="585" class="field-value">${escapeXml(formattedIssueDate(data))}</text>
    <text x="950" y="548" class="field-label">STATUS</text>
    <path d="M952 568 963 563l11 5v10c0 10-7 17-11 19-4-2-11-9-11-19v-10Z" fill="none" stroke="#77f2bd" stroke-width="2.5"/><path d="m958 579 4 4 7-9" fill="none" stroke="#77f2bd" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="985" y="585" fill="#77f2bd" font-size="18" font-weight="700">${escapeXml(statusLabel(data))}</text>
  </g>

  <g transform="translate(60 700)">
    <rect width="1080" height="92" rx="22" fill="#06194f" fill-opacity="0.68" stroke="#aac2ff" stroke-opacity="0.38"/>
    <circle cx="32" cy="36" r="6" fill="#63d9a0"/>
    <circle cx="32" cy="36" r="12" fill="#63d9a0" fill-opacity="0.12"/>
    <text x="58" y="34" fill="white" fill-opacity="0.94" font-size="18" font-weight="700">Verified by Webcoin Labs</text>
    <text x="58" y="60" fill="white" fill-opacity="0.62" font-size="14">Identity and invitation confirmed</text>
    <text x="1035" y="32" text-anchor="end" fill="white" fill-opacity="0.55" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="12" font-weight="700" letter-spacing="2">SOULBOUND</text>
    <text x="1035" y="61" text-anchor="end" fill="white" fill-opacity="0.94" font-family="DejaVu Sans Mono, DejaVu Sans, monospace" font-size="15" font-weight="700" letter-spacing="2">NON-TRANSFERABLE</text>
  </g>
</svg>`;
}

export async function renderFounderPassArtwork(data: FounderPassArtworkData): Promise<Buffer> {
  const brandAssets = await loadFounderPassBrandAssets();
  return sharp(Buffer.from(buildFounderPassSvg({ ...data, ...brandAssets })), { density: 144, failOn: "error" })
    .resize(ARTWORK_WIDTH, ARTWORK_HEIGHT, { fit: "fill" })
    .webp({ quality: 92, alphaQuality: 95, effort: 5 })
    .toBuffer();
}

function artworkObjectKey(data: FounderPassArtworkData): string {
  if (!Number.isSafeInteger(data.id) || data.id <= 0) throw new Error("Founder pass ID must be a positive integer");
  const fingerprint = createHash("sha256").update(JSON.stringify({
    version: ARTWORK_VERSION,
    id: data.id,
    variant: data.variant,
    displayName: data.displayName ?? null,
    username: data.username ?? null,
    avatarUrl: data.avatarUrl ?? null,
    founderTitle: data.founderTitle ?? null,
    companyName: data.companyName ?? null,
    companyIndustry: data.companyIndustry ?? null,
    companyLogoUrl: data.companyLogoUrl ?? null,
    tierName: data.tierName ?? null,
    passNumber: data.passNumber ?? null,
    network: data.network ?? null,
    issuedAt: asDate(data.issuedAt)?.toISOString() ?? null,
    claimedAt: asDate(data.claimedAt)?.toISOString() ?? null,
    eligibilityStatus: data.eligibilityStatus ?? null,
    claimStatus: data.claimStatus ?? null,
  })).digest("hex").slice(0, 16);
  return `passes/founder/${data.id}-${fingerprint}.webp`;
}

async function remoteImageBuffer(value: string): Promise<Buffer | null> {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || !REMOTE_IMAGE_HOSTS.has(url.hostname.toLowerCase())) return null;

  try {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(4_000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("image/")) return null;
    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_EMBEDDED_IMAGE_BYTES) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length <= MAX_EMBEDDED_IMAGE_BYTES ? buffer : null;
  } catch {
    return null;
  }
}

export async function artworkImageDataUrl(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const normalized = normalizeUploadedImageUrl(value);
  const source = normalized?.startsWith("/uploads/")
    ? await readStoredImage(normalized)
    : await remoteImageBuffer(value);
  if (!source) return null;

  try {
    const png = await sharp(source, { failOn: "error", limitInputPixels: 20_000_000 })
      .rotate()
      .resize(320, 320, { fit: "cover" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export function absoluteArtworkUrl(value: string, appUrl: string): string {
  if (/^https:\/\//i.test(value)) return value;
  return new URL(value, `${appUrl.replace(/\/+$/, "")}/`).toString();
}

export async function ensureFounderPassArtwork(data: FounderPassArtworkData, appUrl: string): Promise<string> {
  const objectKey = artworkObjectKey(data);
  let job = artworkJobs.get(objectKey);
  if (!job) {
    job = (async () => {
      const existing = await findGeneratedArtworkUrl(objectKey);
      if (existing) return existing;
      const [avatarDataUrl, companyLogoDataUrl] = await Promise.all([
        artworkImageDataUrl(data.avatarUrl),
        artworkImageDataUrl(data.companyLogoUrl),
      ]);
      const artwork = await renderFounderPassArtwork({ ...data, avatarDataUrl, companyLogoDataUrl });
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
