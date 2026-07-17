import * as React from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Building2, Fingerprint, Lock, ShieldCheck, UserRound } from "lucide-react";
import { SiX } from "react-icons/si";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "@/components/company-logo";
import { FounderPassVariantBadge } from "@/components/founder-pass-variant-badge";
import { formatDate } from "@/lib/format";

export interface FounderPassCardData {
  variant: "normal" | "premium_black";
  displayName?: string | null;
  username?: string | null;
  xUsername?: string | null;
  avatarUrl?: string | null;
  fallbackAvatarUrl?: string | null;
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

function ArcNetworkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 500" role="img" aria-label="Arc" className={className}>
      <rect width="500" height="500" rx="250" fill="#1B3158" />
      <path
        fill="white"
        d="M250.466 85c40.921 0 77.296 35.453 102.433 99.828 13.074 33.482 22.693 73.263 28.392 116.54.51 3.865.943 7.793 1.388 11.713.145.242.232.467.202.65 0 0 3.35 20.918 4.061 57.27h-.378c-4.967-4.077-63.553-50.112-160.67-36.782 1.465-16.435 3.48-32.426 6.084-47.754.133-.783.287-1.54.422-2.318 38.091-1.148 71.431 3.275 96.997 9.072-.095-.607-.174-1.231-.271-1.835-5.255-32.726-13.008-62.687-23.005-88.291-16.345-41.866-37.674-67.877-55.655-67.877-17.98 0-39.309 26.012-55.654 67.877-3.956 10.126-7.558 20.926-10.788 32.317-4.541 15.962-8.356 33.074-11.403 51.054-4.509 26.553-7.326 55.032-8.364 84.537H114c2.319-70.017 14.19-135.362 34.033-186.173C173.165 120.453 209.545 85 250.466 85Z"
      />
    </svg>
  );
}

function credentialId(data: FounderPassCardData): string {
  if (!data.passNumber) return "ARC-FND-PENDING";
  const year = data.issuedAt ? new Date(data.issuedAt).getUTCFullYear() : new Date().getUTCFullYear();
  return `ARC-FND-${year}-${String(data.passNumber).padStart(4, "0")}`;
}

function statusLabel(data: FounderPassCardData): string {
  if (data.claimStatus === "minted") return "Onchain";
  if (data.claimStatus === "claimed") return "Claimed";
  if (data.eligibilityStatus === "eligible") return "Eligible";
  if (data.eligibilityStatus === "under_review") return "Under review";
  return "Invite only";
}

export const FounderPassCard = React.forwardRef<HTMLDivElement, FounderPassCardProps>(function FounderPassCard(
  { data, className, interactive = true },
  ref,
) {
  const isPremium = data.variant === "premium_black";
  const eligibleUnclaimed = data.eligibilityStatus === "eligible" && (data.claimStatus ?? "locked") === "locked";
  const dimmed = !data.claimStatus || (data.claimStatus === "locked" && data.eligibilityStatus !== "eligible");
  const avatarUrl = data.avatarUrl || data.fallbackAvatarUrl;
  const socialUsername = (data.xUsername || data.username || "identity-pending").replace(/^@/, "");
  const status = statusLabel(data);

  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -5, rotateX: 1.2, rotateY: -1.2 } : undefined}
      transition={{ type: "spring", stiffness: 280, damping: 25 }}
      className={cn(
        "group relative aspect-[1.48/1] w-full max-w-[680px] overflow-hidden rounded-[24px] border shadow-[0_32px_90px_rgba(0,0,0,.5)] sm:rounded-[30px]",
        isPremium ? "pass-material-founder-black" : "pass-material-founder-normal",
        dimmed && "grayscale-[25%] opacity-75",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          isPremium
            ? "bg-[radial-gradient(circle_at_88%_8%,rgba(139,92,246,.34),transparent_34%),radial-gradient(circle_at_8%_92%,rgba(37,99,235,.22),transparent_40%),linear-gradient(118deg,transparent_28%,rgba(255,255,255,.09)_48%,transparent_62%)]"
            : "bg-[radial-gradient(circle_at_86%_5%,rgba(79,113,255,.38),transparent_34%),radial-gradient(circle_at_8%_92%,rgba(34,211,238,.16),transparent_38%),linear-gradient(118deg,transparent_28%,rgba(255,255,255,.09)_48%,transparent_62%)]",
        )}
      />
      <div className="pointer-events-none absolute -right-[9%] -top-[34%] size-[58%] rounded-full border border-white/10" />
      <div className="pointer-events-none absolute right-[2%] top-[-20%] size-[39%] rounded-full border border-white/[0.07]" />
      <div className="pointer-events-none absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

      <div className="relative z-10 flex h-full flex-col p-[4.5%] pb-[3.8%]">
        <header className="flex items-start justify-between gap-3">
          <img
            src="/brand/arc-pass-logo.webp"
            alt="Arc Pass by Webcoin Labs"
            className="h-auto w-[27%] min-w-[92px] max-w-[170px] object-contain object-left"
          />
          <div className="flex flex-col items-end gap-1 sm:gap-1.5">
            <span className="font-mono text-[7px] font-semibold uppercase tracking-[0.2em] text-white/48 min-[420px]:text-[8px] sm:text-[10px]">Founder Pass</span>
            <FounderPassVariantBadge variant={data.variant} className="px-2 py-0.5 text-[8px] min-[420px]:px-2.5 min-[420px]:text-[9px] sm:px-3 sm:py-1 sm:text-[11px]" />
          </div>
        </header>

        <div className="mt-[4%] grid min-h-0 flex-1 grid-cols-[1.08fr_.92fr] items-center gap-[5%]">
          <section className="flex min-w-0 items-center gap-[6%]" aria-label="Founder identity">
            <div className="relative grid aspect-square w-[31%] min-w-12 max-w-[92px] shrink-0 place-items-center overflow-hidden rounded-[18%] border border-white/20 bg-white/[0.08] shadow-[0_14px_38px_rgba(0,0,0,.34),inset_0_1px_rgba(255,255,255,.15)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${data.displayName || "Founder"} profile`} className="size-full object-cover" crossOrigin="anonymous" />
              ) : (
                <UserRound className="size-[42%] text-white/42" aria-hidden="true" />
              )}
              <span className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-[#56d8ff] via-[#7895ff] to-[#b38cff]" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[6px] font-semibold uppercase tracking-[0.18em] text-white/42 min-[420px]:text-[7px] sm:text-[9px]">Cardholder</p>
              <p className="mt-1 truncate text-[clamp(.78rem,3vw,1.55rem)] font-semibold leading-none tracking-[-0.025em] text-white">
                {data.displayName || "Founder identity pending"}
              </p>
              <p className="mt-1 truncate text-[7px] font-medium text-[#bfcaff] min-[420px]:text-[8px] sm:mt-1.5 sm:text-[11px]">
                {data.founderTitle || "Founder"}
              </p>
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-[7%] backdrop-blur-md sm:rounded-2xl" aria-label="Company">
            <p className="font-mono text-[6px] font-semibold uppercase tracking-[0.18em] text-white/42 min-[420px]:text-[7px] sm:text-[9px]">Company</p>
            <div className="mt-[7%] flex min-w-0 items-center gap-[7%]">
              {data.companyName ? (
                <CompanyLogo
                  logoUrl={data.companyLogoUrl}
                  name={data.companyName}
                  size="md"
                  className="size-8 border-white/20 bg-[#111a2f] shadow-[0_8px_24px_rgba(0,0,0,.3)] min-[420px]:size-9 sm:size-12"
                />
              ) : (
                <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.07] min-[420px]:size-9 sm:size-12">
                  <Building2 className="size-4 text-white/42 sm:size-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[10px] font-semibold leading-tight text-white min-[420px]:text-xs sm:text-base">{data.companyName || "Company pending"}</p>
                <p className="mt-0.5 truncate text-[6px] text-white/42 min-[420px]:text-[7px] sm:text-[9px]">{data.companyIndustry || "Verified founder company"}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-[1.4fr_.8fr_.82fr] gap-[3%] border-y border-white/10 py-[2.6%]">
          <div className="min-w-0">
            <p className="font-mono text-[5px] uppercase tracking-[0.16em] text-white/35 min-[420px]:text-[6px] sm:text-[8px]">Credential</p>
            <p className="mt-0.5 truncate font-mono text-[7px] font-semibold tracking-[0.04em] text-white/86 min-[420px]:text-[8px] sm:text-[11px]">{credentialId(data)}</p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[5px] uppercase tracking-[0.16em] text-white/35 min-[420px]:text-[6px] sm:text-[8px]">Blockchain</p>
            <p className="mt-0.5 flex items-center gap-1 text-[7px] font-semibold text-white/86 min-[420px]:text-[8px] sm:gap-1.5 sm:text-[11px]">
              <ArcNetworkMark className="size-3 shrink-0 rounded-full sm:size-4" /> Arc
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[5px] uppercase tracking-[0.16em] text-white/35 min-[420px]:text-[6px] sm:text-[8px]">Status</p>
            <p className={cn("mt-0.5 flex items-center gap-1 truncate text-[7px] font-semibold min-[420px]:text-[8px] sm:text-[11px]", data.claimStatus === "minted" || data.eligibilityStatus === "eligible" ? "text-[#77f2bd]" : "text-white/72")}>
              {data.claimStatus === "minted" ? <BadgeCheck className="size-3 shrink-0 sm:size-4" aria-hidden="true" /> : <ShieldCheck className="size-3 shrink-0 sm:size-4" aria-hidden="true" />}
              {status}
            </p>
          </div>
        </div>

        <footer className="mt-[2.8%] flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[7px] font-semibold text-white/84 min-[420px]:text-[8px] sm:text-[11px]">
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-white text-black sm:size-5"><SiX className="size-2 sm:size-2.5" aria-hidden="true" /></span>
              @{socialUsername}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[5px] uppercase tracking-[0.16em] text-white/35 min-[420px]:text-[6px] sm:text-[8px]">Issued</p>
            <p className="mt-0.5 text-[7px] font-semibold text-white/84 min-[420px]:text-[8px] sm:text-[11px]">{data.issuedAt ? formatDate(data.issuedAt) : "Awaiting onchain mint"}</p>
          </div>
        </footer>
      </div>

      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#65dcff] via-[#526fff] to-[#a970ff]" aria-hidden="true" />
      <Fingerprint className="pointer-events-none absolute bottom-[7%] right-[4%] size-[16%] text-white/[0.018]" aria-hidden="true" />
      {eligibleUnclaimed && (
        <div className="absolute right-[3.2%] top-[44%] grid size-7 place-items-center rounded-full border border-white/10 bg-black/45 backdrop-blur-md sm:size-9">
          <Lock className="size-3 text-white/72 sm:size-4" aria-hidden="true" />
        </div>
      )}
    </motion.div>
  );
});
