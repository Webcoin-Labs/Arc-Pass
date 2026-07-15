import * as React from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/company-logo";
import { TierEmblem } from "@/components/tier-badge";
import { FounderPassVariantBadge } from "@/components/founder-pass-variant-badge";
import { formatPassNumber, formatDate, formatNetworkLabel } from "@/lib/format";

export interface FounderPassCardData {
  variant: "normal" | "premium_black";
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  founderTitle?: string | null;
  companyName?: string | null;
  companyIndustry?: string | null;
  companyLogoUrl?: string | null;
  founderTier?: { name: string; emblemUrl?: string | null; accentColor?: string | null } | null;
  passNumber?: number | null;
  network?: string | null;
  issuedAt?: string | null;
  eligibilityStatus?: string;
  claimStatus?: string;
}

interface FounderPassCardProps {
  data: FounderPassCardData;
  className?: string;
  interactive?: boolean;
}

export const FounderPassCard = React.forwardRef<HTMLDivElement, FounderPassCardProps>(function FounderPassCard(
  { data, className, interactive = true },
  ref,
) {
  const isPremium = data.variant === "premium_black";
  const eligibleUnclaimed = data.eligibilityStatus === "eligible" && (data.claimStatus ?? "locked") === "locked";
  const dimmed = !data.claimStatus || (data.claimStatus === "locked" && data.eligibilityStatus !== "eligible");
  const isMinted = data.claimStatus === "minted";

  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -4 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn(
        "relative flex aspect-[1/1.48] w-full max-w-[360px] flex-col overflow-hidden rounded-2xl border shadow-lg",
        isPremium ? "pass-material-founder-black" : "pass-material-founder-normal",
        dimmed && "grayscale-[35%] opacity-70",
        className,
      )}
    >
      {/* Restrained reflective highlight, not an animated glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
      {isPremium && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(255,255,255,0.08),transparent_45%)]" />}

      <div className="relative z-10 flex flex-1 flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-70">Arc Pass</p>
            <p className="text-[10px] opacity-50">Powered by Webcoin Labs</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <FounderPassVariantBadge variant={data.variant} />
            {!dimmed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium opacity-70">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified Founder
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-white/5">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserRound className="h-7 w-7 opacity-40" aria-hidden="true" />
              </div>
            )}
          </div>
          <div>
            <p className="text-lg font-semibold leading-tight">{data.displayName || "Founder identity pending"}</p>
            {data.username && <p className="text-sm opacity-60">@{data.username}</p>}
            {data.founderTitle && <p className="mt-0.5 text-xs opacity-70">{data.founderTitle}</p>}
          </div>

          {data.founderTier && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3">
              <TierEmblem tier={data.founderTier} size="sm" />
              <span className="text-xs font-medium">{data.founderTier.name}</span>
            </div>
          )}

          {data.companyName && (
            <div className="flex items-center gap-2 border-t border-white/10 pt-3">
              <CompanyLogo logoUrl={data.companyLogoUrl} name={data.companyName} size="sm" />
              <div>
                <p className="text-sm font-medium leading-tight">{data.companyName}</p>
                {data.companyIndustry && <p className="text-[11px] opacity-60">{data.companyIndustry}</p>}
              </div>
            </div>
          )}
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
            <p className="opacity-50">Issued</p>
            <p>{data.issuedAt ? formatDate(data.issuedAt) : "Not yet issued"}</p>
          </div>
          <div>
            <p className="opacity-50">Onchain</p>
            <p>{isMinted ? "Recorded" : "Pending"}</p>
          </div>
        </div>
      </div>

      {eligibleUnclaimed && (
        <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
          <Lock className="h-3.5 w-3.5 text-white" aria-hidden="true" />
        </div>
      )}
    </motion.div>
  );
});
