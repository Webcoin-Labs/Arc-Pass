import * as React from "react";
import { motion } from "framer-motion";
import { Activity, Code2, Github, Lock, MessageCircle, ShieldCheck, TrendingUp, UserRound, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { TierEmblem } from "@/components/tier-badge";
import { formatPassNumber, formatDate, formatNetworkLabel } from "@/lib/format";

export interface BuilderPassCardData {
  displayName?: string | null;
  discordUsername?: string | null;
  discordAvatarUrl?: string | null;
  builderRole?: string | null;
  currentTier?: { name: string; emblemUrl?: string | null; accentColor?: string | null } | null;
  githubVerified?: boolean;
  githubContributionCount?: number | null;
  githubContributionsUpdatedAt?: string | null;
  verifiedWalletCount?: number;
  qualifyingTransactionCount?: number | null;
  validContractCount?: number | null;
  discordCommunityMember?: boolean | null;
  discordCommunityJoinedAt?: string | null;
  discordCommunityRoles?: string[];
  discordCommunityPrimaryRoles?: Array<{ id: string; name: string | null; hasRole: boolean | null }>;
  passNumber?: number | null;
  network?: string | null;
  lastVerifiedAt?: string | null;
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
}

type BuilderTierKey = "bronze" | "silver" | "gold" | "platinum" | "diamond";

interface BuilderTierTheme {
  accent: string;
  accentStrong: string;
  cardFrom: string;
  cardTo: string;
  border: string;
  glow: string;
  panel: string;
  emblemUrl: string;
}

const BUILDER_TIER_THEMES: Record<BuilderTierKey, BuilderTierTheme> = {
  bronze: { accent: "#b97847", accentStrong: "#f0b27d", cardFrom: "#302017", cardTo: "#111116", border: "rgba(191, 125, 77, .58)", glow: "rgba(191, 125, 77, .35)", panel: "rgba(110, 63, 35, .22)", emblemUrl: "/tiers/bronze.png" },
  silver: { accent: "#9aacc1", accentStrong: "#e1ebf7", cardFrom: "#202a3a", cardTo: "#101218", border: "rgba(174, 194, 218, .56)", glow: "rgba(174, 194, 218, .28)", panel: "rgba(105, 126, 154, .2)", emblemUrl: "/tiers/silver.png" },
  gold: { accent: "#d49a26", accentStrong: "#ffe08a", cardFrom: "#342812", cardTo: "#12131a", border: "rgba(224, 174, 54, .62)", glow: "rgba(224, 174, 54, .35)", panel: "rgba(132, 92, 18, .22)", emblemUrl: "/tiers/gold.png" },
  platinum: { accent: "#63c9c8", accentStrong: "#bff7f2", cardFrom: "#123339", cardTo: "#10151c", border: "rgba(100, 211, 206, .62)", glow: "rgba(100, 211, 206, .34)", panel: "rgba(28, 121, 124, .22)", emblemUrl: "/tiers/platinum.png" },
  diamond: { accent: "#8ea9ff", accentStrong: "#dbe4ff", cardFrom: "#1b2d5d", cardTo: "#0e1426", border: "rgba(142, 169, 255, .68)", glow: "rgba(93, 126, 255, .42)", panel: "rgba(55, 83, 172, .24)", emblemUrl: "/tiers/diamond.png" },
};

const DEFAULT_BUILDER_TIER_THEME: BuilderTierTheme = {
  accent: "#7895ff",
  accentStrong: "#dce3ff",
  cardFrom: "#1a2340",
  cardTo: "#10131c",
  border: "rgba(120, 149, 255, .5)",
  glow: "rgba(79, 113, 255, .28)",
  panel: "rgba(53, 74, 143, .18)",
  emblemUrl: "/tiers/silver.png",
};

function getBuilderTierTheme(tier?: BuilderPassCardData["currentTier"]): BuilderTierTheme {
  const normalizedName = tier?.name?.toLowerCase().replace(/\s+/g, "") ?? "";
  const key = normalizedName === "golden" ? "gold" : normalizedName;
  const base = key in BUILDER_TIER_THEMES ? BUILDER_TIER_THEMES[key as BuilderTierKey] : DEFAULT_BUILDER_TIER_THEME;
  return tier?.accentColor ? { ...base, accent: tier.accentColor } : base;
}

export const BuilderPassCard = React.forwardRef<HTMLDivElement, BuilderPassCardProps>(function BuilderPassCard(
  { data, className, interactive = true },
  ref,
) {
  const eligibleUnclaimed = data.eligibilityStatus === "eligible" && (data.claimStatus ?? "locked") === "locked";
  const dimmed = !data.claimStatus || (data.claimStatus === "locked" && data.eligibilityStatus !== "eligible") || data.isRevoked;
  const isMinted = data.claimStatus === "minted";
  const tierTheme = getBuilderTierTheme(data.currentTier);
  const tier = data.currentTier ? { ...data.currentTier, accentColor: tierTheme.accent, emblemUrl: data.currentTier.emblemUrl ?? tierTheme.emblemUrl } : null;
  const communityStatus = data.discordCommunityMember === true ? "Discord community member" : data.discordCommunityMember === false ? "Not in Arc Discord" : "Discord membership not checked";
  const communityTone = data.discordCommunityMember === true ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : data.discordCommunityMember === false ? "border-white/10 bg-black/15 text-white/45" : "border-amber-200/20 bg-amber-200/10 text-amber-100/70";

  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -5, rotateX: 1.5, rotateY: -1.5 } : undefined}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={cn(
        "pass-material-builder group relative flex min-h-[280px] w-full max-w-[560px] flex-col overflow-hidden rounded-[28px] border shadow-[0_32px_90px_rgba(0,0,0,.48)] sm:aspect-[1.58/1] sm:min-h-0",
        dimmed && "grayscale-[35%] opacity-70",
        className,
      )}
      style={{
        ["--tier-accent" as string]: tierTheme.accent,
        backgroundImage: `linear-gradient(145deg, ${tierTheme.cardFrom}, ${tierTheme.cardTo})`,
        borderColor: tierTheme.border,
        boxShadow: `0 32px 90px rgba(0,0,0,.48), 0 0 42px ${tierTheme.glow}`,
      } as React.CSSProperties}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 82% 8%, ${tierTheme.glow}, transparent 34%), linear-gradient(118deg, transparent 30%, rgba(255,255,255,.1) 50%, transparent 64%)` }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-80" style={{ background: `linear-gradient(to right, transparent, ${tierTheme.accentStrong}, transparent)` }} />
      <div className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full border border-white/10" />
      <div className="pointer-events-none absolute -right-8 -top-12 size-36 rounded-full border border-white/[0.07]" />

      <div className="relative z-10 flex h-full flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <img src="/brand/arc-pass-logo.webp" alt="Arc Pass" className="h-7 w-auto max-w-[142px] object-contain object-left sm:h-8 sm:max-w-[172px]" />
          <div className="flex flex-col items-end gap-1.5">
            <span
              className="rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px]"
              style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 55%, transparent)`, backgroundColor: `color-mix(in srgb, ${tierTheme.accent} 16%, transparent)`, color: tierTheme.accentStrong }}
            >
              Builder Pass
            </span>
            {!dimmed && <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55 sm:text-[10px]"><ShieldCheck className="size-3" style={{ color: tierTheme.accentStrong }} aria-hidden="true" /> Work verified</span>}
          </div>
        </div>

        <div className="mt-6 grid flex-1 grid-cols-[1.2fr_.8fr] items-end gap-4 sm:mt-7 sm:gap-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_rgba(255,255,255,.08)] sm:size-16">
              {data.discordAvatarUrl ? <img src={data.discordAvatarUrl} alt="" className="size-full object-cover" /> : <UserRound className="size-6 text-white/45" aria-hidden="true" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-semibold leading-tight text-white sm:text-2xl">{data.displayName || "Builder identity pending"}</p>
              {data.discordUsername && <p className="mt-1 truncate font-mono text-[10px] text-white/45 sm:text-xs">@{data.discordUsername}</p>}
              {data.builderRole && <p className="mt-1 truncate text-xs font-medium sm:text-sm" style={{ color: tierTheme.accentStrong }}>{data.builderRole}</p>}
            </div>
          </div>

          <div className="rounded-2xl border p-3 backdrop-blur-md sm:p-4" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 30%, transparent)`, backgroundColor: tierTheme.panel }}>
            <div className="flex items-center gap-2">
              {tier ? <TierEmblem tier={tier} size="sm" /> : <Code2 className="size-5 text-white/40" aria-hidden="true" />}
              <div><p className="text-xs font-semibold sm:text-sm" style={{ color: tierTheme.accentStrong }}>{data.currentTier?.name || "Tier pending"}</p><p className="mt-0.5 text-[9px] text-white/45 sm:text-[10px]">Verified contribution</p></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-[#b9c5ff]">
              <span className="inline-flex items-center gap-1"><Wallet className="size-3" aria-hidden="true" />{data.verifiedWalletCount ?? 0} wallets</span>
              <span className="inline-flex items-center gap-1"><Activity className="size-3" aria-hidden="true" />Active</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 22%, transparent)` }}>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40"><Code2 className="size-3" aria-hidden="true" /> Contracts deployed</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{data.validContractCount ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2.5" style={{ borderColor: `color-mix(in srgb, ${tierTheme.accent} 22%, transparent)` }}>
            <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40"><Github className="size-3" aria-hidden="true" /> GitHub contributions</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{data.githubContributionCount ?? "—"}</p>
          </div>
        </div>

        <div className={cn("mt-3 min-w-0 rounded-xl border px-3 py-2", communityTone)}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em]">
              <MessageCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{communityStatus}</span>
            </span>
            {data.discordCommunityJoinedAt && <span className="shrink-0 text-[9px] text-white/55">Since {formatDate(data.discordCommunityJoinedAt)}</span>}
          </div>
          {data.discordCommunityPrimaryRoles && data.discordCommunityPrimaryRoles.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-1.5 border-t border-white/10 pt-2">
              {data.discordCommunityPrimaryRoles.slice(0, 2).map((role) => (
                <span key={role.id} className="flex min-w-0 items-center gap-1 text-[9px] text-white/65" title={role.name ?? role.id}>
                  <span className={cn("grid size-3.5 shrink-0 place-items-center rounded-full text-[8px]", role.hasRole === true ? "bg-emerald-300/20 text-emerald-200" : role.hasRole === false ? "bg-white/10 text-white/45" : "bg-amber-200/20 text-amber-100")} aria-hidden="true">{role.hasRole === true ? "✓" : role.hasRole === false ? "–" : "?"}</span>
                  <span className="truncate">{role.name ?? "Configured role"}</span>
                </span>
              ))}
            </div>
          ) : data.discordCommunityRoles && data.discordCommunityRoles.length > 0 ? (
            <p className="mt-1 truncate text-[9px] text-white/55" title={data.discordCommunityRoles.join(", ")}>Roles: {data.discordCommunityRoles.slice(0, 2).join(", ")}</p>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/10 pt-4 font-mono text-[9px] tabular-nums sm:text-[10px]">
          <div><p className="text-white/35">PASS</p><p className="mt-1 text-white/80">{formatPassNumber(data.passNumber)}</p></div>
          <div><p className="text-white/35">NETWORK</p><p className="mt-1 text-white/80">{formatNetworkLabel(data.network)}</p></div>
          <div><p className="text-white/35">VERIFIED</p><p className="mt-1 truncate text-white/80">{data.lastVerifiedAt ? formatDate(data.lastVerifiedAt) : "Pending"}</p></div>
          <div><p className="text-white/35">ONCHAIN</p><p className="mt-1 text-white/80">{isMinted ? "Recorded" : "Pending"}</p></div>
        </div>

        {data.upgradeAvailable && <p className="mt-2 inline-flex items-center justify-center gap-1 text-[10px] font-medium text-[#b9c5ff]"><TrendingUp className="size-3" aria-hidden="true" /> Tier upgrade available</p>}
      </div>

      <div className="absolute bottom-0 left-0 top-0 w-1" style={{ background: `linear-gradient(to bottom, ${tierTheme.accentStrong}, ${tierTheme.accent}, transparent)` }} aria-hidden="true" />
      {eligibleUnclaimed && <div className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/50 backdrop-blur-sm"><Lock className="size-3.5 text-white" aria-hidden="true" /></div>}
    </motion.div>
  );
});
