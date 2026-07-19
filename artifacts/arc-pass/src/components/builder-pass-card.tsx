import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, Code2, Github, Lock, MessageCircle, ShieldCheck, TrendingUp, UserRound, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { TierEmblem } from "@/components/tier-badge";
import { NetworkMark } from "@/components/network-mark";
import { formatPassNumber, formatDate, formatNetworkLabel } from "@/lib/format";

export interface BuilderPassCardData {
  displayName?: string | null;
  discordUsername?: string | null;
  discordDiscriminator?: string | null;
  discordAvatarUrl?: string | null;
  builderRole?: string | null;
  currentTier?: { name: string; emblemUrl?: string | null; accentColor?: string | null } | null;
  githubVerified?: boolean;
  githubAccountCreatedAt?: string | null;
  githubContributionCount?: number | null;
  githubContributionWindowStartedAt?: string | null;
  githubContributionsUpdatedAt?: string | null;
  verifiedWalletCount?: number;
  qualifyingTransactionCount?: number | null;
  validContractCount?: number | null;
  discordCommunityMember?: boolean | null;
  discordCommunityJoinedAt?: string | null;
  passNumber?: number | null;
  network?: string | null;
  lastVerifiedAt?: string | null;
  initiallyIssuedAt?: string | null;
  eligibilityStatus?: string;
  claimStatus?: string;
  upgradeAvailable?: boolean;
  isSuspended?: boolean;
  isRevoked?: boolean;
}

interface BuilderPassCardProps {
  data: BuilderPassCardData;
  className?: string;
  interactive?: boolean;
  concealed?: boolean;
}

type BuilderTierKey = "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface BuilderTierTheme {
  accent: string;
  accentStrong: string;
  cardFrom: string;
  cardTo: string;
  border: string;
  sheen: string;
  panel: string;
  emblemUrl: string;
}

const BUILDER_TIER_THEMES: Record<BuilderTierKey, BuilderTierTheme> = {
  bronze: { accent: "#9b704f", accentStrong: "#d5b08f", cardFrom: "#28231f", cardTo: "#171616", border: "rgba(155,112,79,.48)", sheen: "rgba(155,112,79,.08)", panel: "rgba(108,75,51,.16)", emblemUrl: "/tiers/bronze.png" },
  silver: { accent: "#8995a1", accentStrong: "#d0d7de", cardFrom: "#24282c", cardTo: "#161719", border: "rgba(137,149,161,.46)", sheen: "rgba(160,172,184,.07)", panel: "rgba(105,115,125,.15)", emblemUrl: "/tiers/silver.png" },
  gold: { accent: "#ad873e", accentStrong: "#d8bf7a", cardFrom: "#2b271d", cardTo: "#181714", border: "rgba(173,135,62,.52)", sheen: "rgba(187,151,76,.09)", panel: "rgba(119,91,39,.16)", emblemUrl: "/tiers/gold.png" },
  platinum: { accent: "#6d8989", accentStrong: "#bed0ce", cardFrom: "#202929", cardTo: "#151919", border: "rgba(109,137,137,.5)", sheen: "rgba(126,153,151,.08)", panel: "rgba(63,93,92,.16)", emblemUrl: "/tiers/platinum.png" },
  diamond: { accent: "#74819d", accentStrong: "#c5cddd", cardFrom: "#222733", cardTo: "#15171c", border: "rgba(116,129,157,.52)", sheen: "rgba(126,140,169,.08)", panel: "rgba(68,79,103,.16)", emblemUrl: "/tiers/diamond.png" },
};

const DEFAULT_BUILDER_TIER_THEME: BuilderTierTheme = {
  accent: "#778391",
  accentStrong: "#d0d5db",
  cardFrom: "#24282d",
  cardTo: "#15171a",
  border: "rgba(119,131,145,.46)",
  sheen: "rgba(145,155,166,.07)",
  panel: "rgba(84,94,106,.15)",
  emblemUrl: "/tiers/silver.png",
};

function getBuilderTierTheme(tier?: BuilderPassCardData["currentTier"]): BuilderTierTheme {
  const normalizedName = tier?.name?.toLowerCase().replace(/\s+/g, "") ?? "";
  const key = normalizedName === "golden" ? "gold" : normalizedName;
  const base = key in BUILDER_TIER_THEMES ? BUILDER_TIER_THEMES[key as BuilderTierKey] : DEFAULT_BUILDER_TIER_THEME;
  return base;
}

export const BuilderPassCard = React.forwardRef<HTMLDivElement, BuilderPassCardProps>(function BuilderPassCard(
  { data, className, interactive = true, concealed = false },
  ref,
) {
  const eligibleUnclaimed = concealed || (data.eligibilityStatus === "eligible" && (data.claimStatus ?? "locked") === "locked");
  const prefersReducedMotion = useReducedMotion();
  const dimmed = !data.claimStatus || (data.claimStatus === "locked" && data.eligibilityStatus !== "eligible") || data.isRevoked;
  const isMinted = data.claimStatus === "minted";
  const tierTheme = getBuilderTierTheme(data.currentTier);
  const tier = data.currentTier ? { ...data.currentTier, accentColor: tierTheme.accent, emblemUrl: data.currentTier.emblemUrl ?? tierTheme.emblemUrl } : null;
  const communityStatus = data.discordCommunityMember === true ? "Discord community member" : data.discordCommunityMember === false ? "Not in Arc Discord" : "Discord membership not checked";
  const communityTone = data.discordCommunityMember === true ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : data.discordCommunityMember === false ? "border-white/10 bg-black/15 text-white/45" : "border-amber-200/20 bg-amber-200/10 text-amber-100/70";

  return (
    <motion.div
      ref={ref}
      whileHover={interactive && !prefersReducedMotion ? { y: -5, rotateX: 1.5, rotateY: -1.5 } : undefined}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={cn(
        "pass-material-builder group relative flex min-h-[420px] w-full min-w-0 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[18px] border shadow-[0_22px_54px_rgba(0,0,0,.4)] sm:max-w-[600px] sm:rounded-[22px] sm:shadow-[0_28px_70px_rgba(0,0,0,.42)]",
        dimmed && "grayscale-[35%] opacity-70",
        className,
      )}
      style={{
        width: "min(100%, calc(100vw - 3rem))",
        ["--tier-accent" as string]: tierTheme.accent,
        backgroundImage: `linear-gradient(145deg, ${tierTheme.cardFrom}, ${tierTheme.cardTo})`,
        borderColor: tierTheme.border,
        boxShadow: "0 28px 70px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.035)",
      } as React.CSSProperties}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${tierTheme.sheen}, transparent 34%), linear-gradient(118deg, transparent 28%, rgba(255,255,255,.035) 50%, transparent 67%)` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50" style={{ background: `linear-gradient(to right, transparent, ${tierTheme.accentStrong}, transparent)` }} />
      <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full border border-white/[0.055]" />
      <div className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full border border-white/[0.04]" />

      <div className="relative z-10 flex h-full flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-4">
          <img src="/brand/arc-pass-logo.webp" alt="Arc Pass by Webcoin Labs" className="h-7 w-auto max-w-[138px] object-contain object-left sm:max-w-[160px]" />
          <div className="flex flex-col items-end gap-1.5">
            <span
              className="rounded-full border px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] sm:text-[9px]"
              style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 55%, transparent)`, backgroundColor: `color-mix(in srgb, ${tierTheme.accent} 16%, transparent)`, color: tierTheme.accentStrong }}
            >
              Builder Pass
            </span>
            {!dimmed && <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/55 sm:text-[9px]"><ShieldCheck className="size-3" style={{ color: tierTheme.accentStrong }} aria-hidden="true" /> Work verified</span>}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1.08fr)_minmax(112px,.92fr)] items-center gap-3 sm:grid-cols-[1.2fr_.8fr] sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_rgba(255,255,255,.08)] sm:size-14 sm:rounded-2xl">
              {data.discordAvatarUrl ? <img src={data.discordAvatarUrl} alt="" className="size-full object-cover" /> : <UserRound className="size-6 text-white/45" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold leading-tight text-white sm:text-xl">{data.displayName || "Builder identity pending"}</p>
              {data.discordUsername && <p className="mt-1 truncate font-mono text-[10px] text-white/45 sm:text-xs">{data.discordUsername}{data.discordDiscriminator ? `#${data.discordDiscriminator}` : ""}</p>}
              {data.builderRole && <p className="mt-1 truncate text-[10px] font-medium sm:text-xs" style={{ color: tierTheme.accentStrong }}>{data.builderRole}</p>}
            </div>
          </div>

          <div className="rounded-xl border p-2.5 backdrop-blur-md sm:rounded-2xl sm:p-3" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 30%, transparent)`, backgroundColor: tierTheme.panel }}>
            <div className="flex items-center gap-2">
              {tier ? <TierEmblem tier={tier} size="md" /> : <Code2 className="size-5 text-white/40" aria-hidden="true" />}
              <div><p className="text-xs font-semibold sm:text-sm" style={{ color: tierTheme.accentStrong }}>{data.currentTier?.name || "Tier pending"}</p><p className="mt-0.5 text-[9px] text-white/45 sm:text-[10px]">Verified contribution</p></div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 font-mono text-[7px] text-white/55 sm:gap-x-2 sm:text-[8px]">
              <span className="inline-flex items-center gap-1"><Wallet className="size-3" aria-hidden="true" />{typeof data.verifiedWalletCount === "number" && data.verifiedWalletCount > 0 ? `${data.verifiedWalletCount} verified` : "Wallet verification required"}</span>
              <span className="inline-flex items-center gap-1"><Activity className="size-3" aria-hidden="true" />{typeof data.qualifyingTransactionCount === "number" ? `${data.qualifyingTransactionCount} tx` : "Activity pending"}</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/15 px-2.5 py-2" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 22%, transparent)` }}>
            <p className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:text-[8px]"><Code2 className="size-3" aria-hidden="true" /> Contracts deployed</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{data.validContractCount ?? "Not checked"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 px-2.5 py-2" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 22%, transparent)` }}>
            <p className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:text-[8px]"><Github className="size-3" aria-hidden="true" /> GitHub contributions</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{data.githubContributionCount ?? "Not checked"}</p>
          </div>
        </div>

        <div className={cn("mt-2 min-w-0 rounded-xl border px-2.5 py-1.5 sm:px-3", communityTone)}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em]">
              <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{communityStatus}</span>
            </span>
            {data.discordCommunityJoinedAt && <span className="shrink-0 text-[9px] text-white/55">Since {formatDate(data.discordCommunityJoinedAt)}</span>}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/10 pt-2 font-mono text-[7px] tabular-nums sm:grid-cols-4 sm:gap-2 sm:text-[8px]">
          <div><p className="text-white/35">PASS</p><p className="mt-1 text-white/80">{formatPassNumber(data.passNumber)}</p></div>
          <div><p className="text-white/35">NETWORK</p><p className="mt-1 flex items-center gap-1 text-white/80"><NetworkMark network={data.network} className="size-2.5 shrink-0 rounded-full" />{formatNetworkLabel(data.network)}</p></div>
          <div><p className="text-white/35">ISSUE DATE</p><p className="mt-1 truncate text-white/80">{data.initiallyIssuedAt ? formatDate(data.initiallyIssuedAt) : "Assigned after claim"}</p></div>
          <div><p className="text-white/35">ONCHAIN</p><p className="mt-1 text-white/80">{isMinted ? "Recorded" : "Pending"}</p></div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-1.5 sm:px-4 sm:py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-[#79a68d]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[8px] font-semibold text-white/76 sm:text-[10px]">Verified by Webcoin Labs</p>
              <p className="truncate text-[7px] text-white/35 sm:text-[8px]">Identity and activity record</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[6px] uppercase tracking-[0.13em] text-white/32 sm:text-[7px]">Soulbound</p>
            <p className="mt-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.09em] text-white/72 sm:text-[9px]">Non-transferable</p>
          </div>
        </div>

        {data.upgradeAvailable && <p className="mt-2 inline-flex items-center justify-center gap-1 text-[10px] font-medium text-[#b9c5ff]"><TrendingUp className="size-3" aria-hidden="true" /> Tier upgrade available</p>}
      </div>

      <div className="absolute bottom-0 left-0 top-0 w-[3px] opacity-80" style={{ background: tierTheme.accent }} aria-hidden="true" />
      {eligibleUnclaimed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[linear-gradient(145deg,rgba(16,18,20,.97),rgba(12,13,15,.97))] p-6 text-center backdrop-blur-xl">
          <img src="/brand/arc-pass-logo.webp" alt="Arc Pass by Webcoin Labs" className="w-36 max-w-[45%]" />
          <span className="mt-7 grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-white shadow-[0_18px_45px_rgba(0,0,0,.35)]">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-white sm:text-base">Builder credential concealed</p>
          <p className="mt-1 max-w-xs text-[10px] leading-5 text-white/45 sm:text-xs">{concealed ? "Claimed to inventory. Reveal to view your tier and verified activity." : "Claim to reveal your tier and verified activity."}</p>
        </div>
      )}
    </motion.div>
  );
});
