import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
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
  claimedAt?: string | null;
  eligibilityStatus?: string;
  claimStatus?: string;
}

interface FounderPassCardProps {
  data: FounderPassCardData;
  className?: string;
  interactive?: boolean;
  concealed?: boolean;
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
  if (!data.passNumber) return "ASSIGNED AFTER CLAIM";
  const credentialDate = data.issuedAt ?? data.claimedAt;
  const year = credentialDate ? new Date(credentialDate).getUTCFullYear() : new Date().getUTCFullYear();
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
  { data, className, interactive = true, concealed = false },
  ref,
) {
  const isPremium = data.variant === "premium_black";
  const credentialIssueDate = data.issuedAt ?? data.claimedAt;
  const prefersReducedMotion = useReducedMotion();
  const eligibleUnclaimed = concealed || (data.eligibilityStatus === "eligible" && (data.claimStatus ?? "locked") === "locked");
  const dimmed = !data.claimStatus || (data.claimStatus === "locked" && data.eligibilityStatus !== "eligible");
  const avatarUrl = data.avatarUrl || data.fallbackAvatarUrl;
  const socialUsername = (data.xUsername || data.username || "").replace(/^@/, "");
  const status = statusLabel(data);

  return (
    <motion.div
      ref={ref}
      whileHover={interactive && !prefersReducedMotion ? { y: -5, rotateX: 1.2, rotateY: -1.2 } : undefined}
      transition={{ type: "spring", stiffness: 280, damping: 25 }}
      style={{ width: "min(100%, calc(100vw - 3rem))" }}
      className={cn(
        "group relative min-h-[360px] w-full min-w-0 max-w-[calc(100vw-3rem)] overflow-hidden rounded-[18px] border shadow-[0_22px_54px_rgba(0,9,48,.42)] sm:aspect-[1.42/1] sm:min-h-0 sm:max-w-[680px] sm:rounded-[22px] sm:shadow-[0_30px_72px_rgba(0,9,48,.46)]",
        isPremium ? "pass-material-founder-black" : "pass-material-founder-normal",
        dimmed && "grayscale-[25%] opacity-75",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,transparent_20%,rgba(255,255,255,.035)_47%,transparent_68%),radial-gradient(circle_at_18%_92%,rgba(44,116,255,.24),transparent_42%),linear-gradient(180deg,rgba(1,7,38,.22),transparent_48%)]" />
      <div className="pointer-events-none absolute -right-[9%] -top-[34%] size-[58%] rounded-full border border-[#d1a36d]/35" />
      <div className="pointer-events-none absolute right-[2%] top-[-20%] size-[39%] rounded-full border border-[#d1a36d]/25" />
      <div className="pointer-events-none absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-[#82aaff]/55 to-transparent" />

      <div className="relative z-10 flex h-full min-h-[360px] flex-col p-4 sm:min-h-0 sm:p-[4.5%]">
        <header className="flex items-start justify-between gap-3">
          <img
            src="/brand/arc-pass-logo.webp"
            alt="Arc Pass by Webcoin Labs"
            className="h-auto w-[30%] min-w-[100px] max-w-[170px] object-contain object-left sm:w-[27%] sm:min-w-[92px]"
          />
          <div className="flex flex-col items-end gap-1 sm:gap-1.5">
            <span className="max-w-[150px] truncate font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-white/68 sm:text-[10px]">
              Founder Pass
            </span>
            <FounderPassVariantBadge variant={data.variant} className="px-2.5 py-0.5 text-[9px] sm:px-3 sm:py-1 sm:text-[11px]" />
          </div>
        </header>

        <div className="mt-4 grid min-h-0 flex-1 grid-cols-[1.08fr_.92fr] items-center gap-3 sm:mt-[4%] sm:gap-[5%]">
          <section className="flex min-w-0 items-center gap-[6%]" aria-label="Founder identity">
            <div className="relative grid aspect-square w-[31%] min-w-12 max-w-[92px] shrink-0 place-items-center overflow-hidden rounded-[18%] border border-[#a7c0ff]/30 bg-[#092b7d]/55 shadow-[0_12px_30px_rgba(0,11,58,.28),inset_0_1px_rgba(255,255,255,.12)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${data.displayName || "Founder"} profile`} className="size-full object-cover" crossOrigin="anonymous" />
              ) : (
                <UserRound className="size-[42%] text-white/65" aria-hidden="true" />
              )}
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#83a9ff]" />
            </div>
            <div className="min-w-0">
              <p className="font-mono text-[7px] font-semibold uppercase tracking-[0.16em] text-[#b7caff]/75 sm:text-[9px]">Cardholder</p>
              <p className="mt-1 truncate text-[clamp(.9rem,4vw,1.55rem)] font-semibold leading-none tracking-[-0.025em] text-white">
                {data.displayName || "Founder identity pending"}
              </p>
              <p className="mt-1 truncate text-[8px] font-medium text-white/60 sm:mt-1.5 sm:text-[11px]">
                {data.founderTitle || "Founder title not provided"}
              </p>
              {socialUsername && (
                <p className="mt-1.5 flex items-center gap-1.5 truncate text-[8px] font-medium text-white/55 sm:text-[10px]">
                  <span className="grid size-3.5 shrink-0 place-items-center rounded-full bg-white/90 text-black sm:size-4"><SiX className="size-2" aria-hidden="true" /></span>
                  @{socialUsername}
                </p>
              )}
            </div>
          </section>

          <section className="min-w-0 rounded-xl border border-[#9bb9ff]/28 bg-[#08266f]/55 p-3 shadow-[inset_0_1px_rgba(255,255,255,.08),0_12px_30px_rgba(0,12,58,.16)] backdrop-blur-md sm:rounded-2xl sm:p-[7%]" aria-label="Company">
            <p className="font-mono text-[7px] font-semibold uppercase tracking-[0.16em] text-[#b7caff]/80 sm:text-[9px]">Company</p>
            <div className="mt-2.5 flex min-w-0 items-center gap-2.5 sm:mt-[7%] sm:gap-[7%]">
              {data.companyName ? (
                <CompanyLogo
                  logoUrl={data.companyLogoUrl}
                  name={data.companyName}
                  size="md"
                  className="size-9 border-[#9dbaff]/30 bg-[#061c58]/80 shadow-[0_8px_20px_rgba(0,10,52,.24)] sm:size-12"
                />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#9dbaff]/30 bg-[#061c58]/80 sm:size-12">
                  <Building2 className="size-4 text-white/62 sm:size-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold leading-tight text-white sm:text-base">{data.companyName || "Company not provided"}</p>
                <p className="mt-0.5 truncate text-[8px] text-white/58 sm:text-[9px]">{data.companyIndustry || "Company details unavailable"}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-y border-[#a6bfff]/22 py-3 sm:grid-cols-[1.35fr_.7fr_.9fr_.72fr] sm:gap-[3%] sm:py-[2.6%]">
          <div className="min-w-0">
            <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/35 sm:text-[8px]">Credential</p>
            <p className="mt-0.5 truncate font-mono text-[9px] font-semibold tracking-[0.02em] text-white/86 sm:text-[11px]">{credentialId(data)}</p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/35 sm:text-[8px]">Blockchain</p>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-white/86 sm:gap-1.5 sm:text-[11px]">
              <ArcNetworkMark className="size-3 shrink-0 rounded-full sm:size-4" /> Arc
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/35 sm:text-[8px]">Issue date</p>
            <p className="mt-0.5 truncate text-[9px] font-semibold text-white/82 sm:text-[11px]">
              {credentialIssueDate ? formatDate(credentialIssueDate) : "Assigned after claim"}
            </p>
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-white/35 sm:text-[8px]">Status</p>
            <p className={cn("mt-0.5 flex items-center gap-1 truncate text-[9px] font-semibold sm:text-[11px]", data.claimStatus === "minted" || data.eligibilityStatus === "eligible" ? "text-[#77f2bd]" : "text-white/72")}>
              {data.claimStatus === "minted" ? <BadgeCheck className="size-3 shrink-0 sm:size-4" aria-hidden="true" /> : <ShieldCheck className="size-3 shrink-0 sm:size-4" aria-hidden="true" />}
              {status}
            </p>
          </div>
        </div>

        <footer className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#9ebaff]/32 bg-[#06194f]/68 px-3 py-2 shadow-[inset_0_1px_rgba(255,255,255,.09),0_10px_24px_rgba(0,10,52,.16)] backdrop-blur-md sm:mt-[2.8%] sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-1.5 shrink-0 rounded-full bg-[#63d9a0] shadow-[0_0_0_3px_rgba(99,217,160,.11)]" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-[8px] font-semibold text-white/92 sm:text-[11px]">Verified by Webcoin Labs</p>
              <p className="truncate text-[7px] text-white/58 sm:text-[9px]">Identity and invitation confirmed</p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[6px] uppercase tracking-[0.13em] text-white/55 sm:text-[8px]">Soulbound</p>
            <p className="mt-0.5 font-mono text-[7px] font-semibold uppercase tracking-[0.09em] text-white/92 sm:text-[10px]">Non-transferable</p>
          </div>
        </footer>
      </div>

      <div className="absolute inset-y-0 left-0 w-[3px] bg-[#6ea0ff]" aria-hidden="true" />
      <Fingerprint className="pointer-events-none absolute bottom-[7%] right-[4%] size-[16%] text-white/[0.035]" aria-hidden="true" />
      {eligibleUnclaimed && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[linear-gradient(135deg,rgba(13,15,19,.97),rgba(20,18,22,.97))] p-6 text-center backdrop-blur-xl">
          <img src="/brand/arc-pass-logo.webp" alt="Arc Pass by Webcoin Labs" className="w-36 max-w-[45%]" />
          <span className="mt-7 grid size-14 place-items-center rounded-2xl border border-white/15 bg-white/[0.06] text-white shadow-[0_18px_45px_rgba(0,0,0,.35)]">
            <Lock className="size-5" aria-hidden="true" />
          </span>
          <p className="mt-4 text-sm font-semibold text-white sm:text-base">Founder credential concealed</p>
          <p className="mt-1 max-w-xs text-[10px] leading-5 text-white/45 sm:text-xs">{concealed ? "Claimed to inventory. Reveal to view the verified identity and company details." : "Claim to reveal the verified identity and company details."}</p>
        </div>
      )}
    </motion.div>
  );
});
