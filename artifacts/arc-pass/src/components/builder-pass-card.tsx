import * as React from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, UserRound, Wallet, Activity, TrendingUp } from "lucide-react";
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
  verifiedWalletCount?: number;
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

export const BuilderPassCard = React.forwardRef<HTMLDivElement, BuilderPassCardProps>(function BuilderPassCard(
  { data, className, interactive = true },
  ref,
) {
  const eligibleUnclaimed = data.eligibilityStatus === "eligible" && (data.claimStatus ?? "locked") === "locked";
  const dimmed = !data.claimStatus || (data.claimStatus === "locked" && data.eligibilityStatus !== "eligible") || data.isRevoked;
  const isMinted = data.claimStatus === "minted";
  const isClaimedOrMinted = data.claimStatus === "claimed" || isMinted;
  const accent = data.currentTier?.accentColor ?? undefined;

  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "pass-material-builder relative flex aspect-[1/1.48] w-full max-w-[360px] flex-col overflow-hidden rounded-2xl border shadow-lg",
        dimmed && "grayscale-[35%] opacity-70",
        className,
      )}
      style={accent ? ({ ["--tier-accent" as string]: accent } as React.CSSProperties) : undefined}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent" />
      {accent && <div className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-25" style={{ backgroundImage: `linear-gradient(180deg, ${accent}, transparent)` }} />}

      <div className="relative z-10 flex flex-1 flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">Arc Pass</p>
            <p className="text-[10px] opacity-50">Powered by Webcoin Labs</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs font-medium">Onchain Builder Pass</span>
            {!dimmed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium opacity-70">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified Builder
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-white/5">
            {data.discordAvatarUrl ? (
              <img src={data.discordAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserRound className="h-7 w-7 opacity-40" aria-hidden="true" />
              </div>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">{data.displayName || "Builder identity pending"}</p>
            {data.discordUsername && <p className="text-sm opacity-60">@{data.discordUsername}</p>}
            {data.builderRole && <p className="mt-0.5 text-xs opacity-70">{data.builderRole}</p>}
          </div>

          {data.currentTier && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
              <TierEmblem tier={data.currentTier} size="sm" />
              <span className="text-xs font-medium">{data.currentTier.name}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-white/10 pt-3 text-[11px] opacity-80">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Webcoin Labs verified
            </span>
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3 w-3" aria-hidden="true" /> {data.verifiedWalletCount ?? 0} wallet{(data.verifiedWalletCount ?? 0) === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Activity className="h-3 w-3" aria-hidden="true" /> Arc activity detected
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-3 font-mono text-[11px] tabular-nums opacity-80">
          <div>
            <p className="opacity-50">Pass No.</p>
            <p>{formatPassNumber(data.passNumber)}</p>
          </div>
          <div>
            <p className="opacity-50">Network</p>
            <p>{formatNetworkLabel(data.network)}</p>
          </div>
          <div>
            <p className="opacity-50">Last verified</p>
            <p>{data.lastVerifiedAt ? formatDate(data.lastVerifiedAt) : "—"}</p>
          </div>
          <div>
            <p className="opacity-50">Onchain</p>
            <p>{isMinted ? "Recorded" : "Pending"}</p>
          </div>
        </div>

        {isClaimedOrMinted && (
          <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-wide opacity-50">
            {data.upgradeAvailable ? (
              <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[11px] opacity-90">
                <TrendingUp className="h-3 w-3" aria-hidden="true" /> Tier upgrade available
              </span>
            ) : (
              "Upgradeable credential"
            )}
          </p>
        )}
      </div>

      {eligibleUnclaimed && (
        <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
      )}
    </motion.div>
  );
});
