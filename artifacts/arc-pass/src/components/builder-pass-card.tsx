import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Activity, Code2, Gauge, Github, Lock, ShieldCheck, TrendingUp, Trophy, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { TierEmblem } from "@/components/tier-badge";
import { PassNetworkIdentity } from "@/components/pass-network-identity";
import { formatPassNumber, formatDate } from "@/lib/format";

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
  arcActivityAvailable?: boolean | null;
  arcActivityPartial?: boolean | null;
  qualifyingTransactionCount?: number | null;
  validContractCount?: number | null;
  builderLevel?: number | null;
  activityScore?: number | null;
  activityRank?: number | null;
  activityRankTotal?: number | null;
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

interface BuilderPassRankProps {
  data: BuilderPassCardData;
  className?: string;
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
  bronze: { accent: "#d18a56", accentStrong: "#ffd0a9", cardFrom: "#5a3324", cardTo: "#241512", border: "rgba(209,138,86,.68)", sheen: "rgba(255,174,112,.22)", panel: "rgba(77,37,24,.44)", emblemUrl: "/tiers/bronze.png" },
  silver: { accent: "#b6c5d8", accentStrong: "#f0f5fb", cardFrom: "#536273", cardTo: "#222b36", border: "rgba(182,197,216,.68)", sheen: "rgba(218,232,248,.24)", panel: "rgba(35,47,60,.42)", emblemUrl: "/tiers/silver.png" },
  gold: { accent: "#f0bd4e", accentStrong: "#ffe2a1", cardFrom: "#624b1c", cardTo: "#291f0c", border: "rgba(240,189,78,.7)", sheen: "rgba(255,207,103,.24)", panel: "rgba(69,48,12,.46)", emblemUrl: "/tiers/gold.png" },
  platinum: { accent: "#7de0dc", accentStrong: "#d1fffc", cardFrom: "#23615e", cardTo: "#112c2d", border: "rgba(125,224,220,.7)", sheen: "rgba(139,245,239,.22)", panel: "rgba(17,66,65,.43)", emblemUrl: "/tiers/platinum.png" },
  diamond: { accent: "#9eb4ff", accentStrong: "#e1e8ff", cardFrom: "#3155a0", cardTo: "#14214a", border: "rgba(158,180,255,.72)", sheen: "rgba(155,187,255,.26)", panel: "rgba(23,48,103,.43)", emblemUrl: "/tiers/diamond.png" },
};

const DEFAULT_BUILDER_TIER_THEME: BuilderTierTheme = {
  accent: "#b6c5d8",
  accentStrong: "#f0f5fb",
  cardFrom: "#536273",
  cardTo: "#222b36",
  border: "rgba(182,197,216,.68)",
  sheen: "rgba(218,232,248,.24)",
  panel: "rgba(35,47,60,.42)",
  emblemUrl: "/tiers/silver.png",
};

function getBuilderTierTheme(tier?: BuilderPassCardData["currentTier"]): BuilderTierTheme {
  const normalizedName = tier?.name?.toLowerCase().replace(/\s+/g, "") ?? "";
  const key = normalizedName === "golden" ? "gold" : normalizedName;
  const base = key in BUILDER_TIER_THEMES ? BUILDER_TIER_THEMES[key as BuilderTierKey] : DEFAULT_BUILDER_TIER_THEME;
  return base;
}

export function BuilderPassRank({ data, className, concealed = false }: BuilderPassRankProps) {
  const hasRank = typeof data.activityRank === "number" && typeof data.activityRankTotal === "number";

  return (
    <div
      className={cn(
        "mt-3 flex min-h-8 items-center justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:text-xs",
        concealed && "invisible",
        className,
      )}
      aria-live="polite"
    >
      <Trophy className="size-3.5 text-primary" aria-hidden="true" />
      {hasRank ? (
        <span>
          You are ranked <strong className="font-semibold text-foreground">#{data.activityRank!.toLocaleString()}</strong>
          <span className="mx-1 text-muted-foreground/55">/</span>
          {data.activityRankTotal!.toLocaleString()}
        </span>
      ) : (
        <span>Complete activity analysis to receive your rank</span>
      )}
    </div>
  );
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
  const communityStatus = data.discordCommunityMember === true ? "Arc Discord member" : data.discordCommunityMember === false ? "Arc Discord not joined yet" : "Arc Discord membership not checked";
  const communityTone = data.discordCommunityMember === true ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : data.discordCommunityMember === false ? "border-white/10 bg-black/15 text-white/45" : "border-amber-200/20 bg-amber-200/10 text-amber-100/70";

  return (
    <motion.div
      ref={ref}
      whileHover={interactive && !prefersReducedMotion ? { y: -5, rotateX: 1.5, rotateY: -1.5 } : undefined}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={cn(
        "pass-material-builder group relative flex min-h-[430px] w-full min-w-0 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[18px] border shadow-[0_22px_54px_rgba(0,0,0,.4)] sm:min-h-[400px] sm:max-w-[720px] sm:rounded-[22px] sm:shadow-[0_28px_70px_rgba(0,0,0,.42)]",
        dimmed && "grayscale-[35%] opacity-70",
        className,
      )}
      style={{
        width: "min(100%, calc(100vw - 1.5rem))",
        ["--tier-accent" as string]: tierTheme.accent,
        backgroundImage: `radial-gradient(circle at 82% 4%, ${tierTheme.sheen}, transparent 34%), linear-gradient(145deg, ${tierTheme.cardFrom}, ${tierTheme.cardTo})`,
        borderColor: tierTheme.border,
        boxShadow: "0 28px 70px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.035)",
      } as React.CSSProperties}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `linear-gradient(180deg, ${tierTheme.sheen}, transparent 36%), linear-gradient(118deg, transparent 28%, rgba(255,255,255,.055) 50%, transparent 67%)` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-50" style={{ background: `linear-gradient(to right, transparent, ${tierTheme.accentStrong}, transparent)` }} />
      <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full border border-white/[0.055]" />
      <div className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full border border-white/[0.04]" />

      <div className="relative z-10 flex h-full flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <img src="/brand/arc-pass-logo.webp" alt="Arc Pass by Webcoin Labs" className="h-7 w-auto max-w-[138px] object-contain object-left sm:max-w-[160px]" />
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-end gap-1.5">
              <span
                className="rounded-full border px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] sm:text-[9px]"
                style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 55%, transparent)`, backgroundColor: `color-mix(in srgb, ${tierTheme.accent} 16%, transparent)`, color: tierTheme.accentStrong }}
              >
                Builder Pass
              </span>
              {!dimmed && <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/55 sm:text-[9px]"><ShieldCheck className="size-3" style={{ color: tierTheme.accentStrong }} aria-hidden="true" /> Work verified</span>}
            </div>
            <div
              className="flex h-9 items-center gap-1.5"
              aria-label={typeof data.builderLevel === "number" ? `Level ${data.builderLevel}` : "Level pending"}
            >
              <span
                className="grid h-7 place-items-center rounded-md border px-2 font-mono text-[8px] font-bold uppercase tracking-[0.12em] shadow-[inset_0_1px_rgba(255,255,255,.08)]"
                style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 62%, transparent)`, backgroundColor: `color-mix(in srgb, ${tierTheme.accent} 24%, rgba(3,7,18,.72))`, color: tierTheme.accentStrong }}
              >
                LVL
              </span>
              <span className="text-2xl font-bold leading-none tabular-nums sm:text-[28px]" style={{ color: tierTheme.accentStrong }}>{data.builderLevel ?? "--"}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[minmax(0,1.08fr)_minmax(112px,.92fr)] items-center gap-3 sm:grid-cols-[1.2fr_.8fr] sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full border border-white/20 bg-white/[0.07] shadow-[inset_0_1px_rgba(255,255,255,.1)] sm:size-14">
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
              <span className="inline-flex items-center gap-1"><Activity className="size-3" aria-hidden="true" />{data.arcActivityAvailable === false ? "Arc activity unavailable" : typeof data.qualifyingTransactionCount === "number" ? `${data.qualifyingTransactionCount} tx${data.arcActivityPartial ? " captured" : ""}` : "Activity pending"}</span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:gap-2">
          <div className="rounded-xl border border-white/10 bg-black/15 px-2.5 py-2" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 22%, transparent)` }}>
            <p className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:text-[8px]"><Code2 className="size-3" aria-hidden="true" /> Contracts deployed</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{data.arcActivityAvailable === false ? "Unavailable" : data.validContractCount ?? "Not checked"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 px-2.5 py-2" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 22%, transparent)` }}>
            <p className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:text-[8px]"><Github className="size-3" aria-hidden="true" /> GitHub contributions</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">{data.githubContributionCount ?? "Not checked"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 px-2.5 py-2" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 22%, transparent)` }}>
            <p className="flex items-center gap-1 text-[7px] font-semibold uppercase tracking-[0.1em] text-white/40 sm:text-[8px]"><Gauge className="size-3" aria-hidden="true" /> Activity score</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-white sm:text-base">
              {data.activityScore ?? "--"}<span className="ml-0.5 text-[8px] font-medium text-white/35 sm:text-[9px]">/100</span>
            </p>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/10 pt-2 font-mono text-[7px] tabular-nums sm:grid-cols-4 sm:gap-2 sm:text-[8px]">
          <div><p className="text-white/35">PASS</p><p className="mt-1 text-white/80">{formatPassNumber(data.passNumber)}</p></div>
          <div><p className="text-white/35">NETWORK</p><p className="mt-1 flex min-h-3 items-center text-white/80"><PassNetworkIdentity network={data.network} className="h-2.5 sm:h-3" /></p></div>
          <div><p className="text-white/35">ISSUE DATE</p><p className="mt-1 truncate text-white/80">{data.initiallyIssuedAt ? formatDate(data.initiallyIssuedAt) : "Assigned after claim"}</p></div>
          <div><p className="text-white/35">ONCHAIN</p><p className="mt-1 text-white/80">{isMinted ? "Recorded" : "Pending"}</p></div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-black/15 px-3 py-1.5 sm:px-4 sm:py-2">
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

        <div className={cn("mt-1.5 min-w-0 rounded-xl border px-2.5 py-1.5 sm:px-3", communityTone)}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[9px] font-semibold tracking-[0.04em]">
              <img src="/logo/Arc_network-A.svg" alt="Arc" className="size-3.5 shrink-0 object-contain" />
              <span className="truncate">{communityStatus}</span>
            </span>
            {data.discordCommunityJoinedAt && <span className="shrink-0 text-[9px] text-white/55">Since {formatDate(data.discordCommunityJoinedAt)}</span>}
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
