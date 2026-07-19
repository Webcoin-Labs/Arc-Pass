import { useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Activity,
  BadgeCheck,
  Blocks,
  Check,
  CircleAlert,
  Clock3,
  Code2,
  Fingerprint,
  Github,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import type { EligibilityQueryPlatform, EligibilityResult } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const scanStages = [
  {
    title: "Scanning verified databases",
    detail: "Matching this social handle against the Arc Pass registry.",
  },
  {
    title: "Checking Founder invitations",
    detail: "Looking for an active, admin-issued Founder Pass invitation.",
  },
  {
    title: "Preparing Builder verification",
    detail: "Identifying the GitHub and signed-wallet checks required after login.",
  },
  {
    title: "Checking Arc verification readiness",
    detail: "Confirming which ownership-gated activity checks can run securely.",
  },
  {
    title: "Preparing your private preview",
    detail: "Keeping private account and wallet details concealed until you sign in.",
  },
] as const;

function GeoSyncLoader({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("ld-flip block shrink-0 text-[#8da2ff]", className)}
      style={{ "--flip-size": `${size}px`, "--ink": "currentColor" } as CSSProperties}
      aria-hidden="true"
    />
  );
}

function ScanningPassCard({ kind, className }: { kind: "founder" | "builder"; className?: string }) {
  const founder = kind === "founder";

  return (
    <div
      className={cn(
        "relative aspect-[1.58/1] w-[72%] max-w-[390px] overflow-hidden rounded-[1.35rem] border shadow-[0_24px_75px_rgba(0,0,0,.48)]",
        founder
          ? "border-[#e9e2d5]/25 bg-[linear-gradient(145deg,#171717,#080808)]"
          : "border-[#7895ff]/30 bg-[linear-gradient(145deg,#263a83,#080c1c_76%)]",
        className,
      )}
      aria-hidden="true"
    >
      <div className={cn("absolute inset-y-0 left-0 w-1", founder ? "bg-[#e9e2d5]" : "bg-[#6882ff]")} />
      <div className="absolute -right-[10%] -top-[48%] size-[72%] rounded-full border border-white/10" />
      <div className="absolute -right-[2%] -top-[30%] size-[49%] rounded-full border border-white/[0.07]" />
      <div className="flex h-full flex-col p-[6.5%]">
        <div className="flex items-start justify-between gap-3">
          <img src="/brand/arc-pass-logo.webp" alt="" className="h-auto w-[29%] min-w-[76px] max-w-[118px] object-contain object-left" />
          <span className={cn("rounded-full border px-2.5 py-1 font-mono text-[7px] font-semibold tracking-[0.13em]", founder ? "border-[#e9e2d5]/25 text-[#e9e2d5]/72" : "border-[#7895ff]/35 text-[#b7c2ff]")}>
            {founder ? "FOUNDER" : "BUILDER"}
          </span>
        </div>

        <div className="my-auto flex items-center gap-3">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", founder ? "border-[#e9e2d5]/20 bg-[#e9e2d5]/8" : "border-[#7895ff]/25 bg-[#6882ff]/12")}>
            {founder ? <BadgeCheck className="size-4 text-[#e9e2d5]/65" /> : <Blocks className="size-4 text-[#aab7ff]" />}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-2 w-[72%] rounded-full bg-white/20" />
            <span className="block h-1.5 w-[48%] rounded-full bg-white/10" />
          </div>
        </div>

        <div className="flex items-end justify-between border-t border-white/10 pt-[4%] font-mono text-[7px] tracking-[0.1em] text-white/35">
          <span>PRIVATE PREVIEW</span>
          <span>ARC // 00</span>
        </div>
      </div>
    </div>
  );
}

function PendingCardScan({ platform, stageIndex, reduceMotion, className }: { platform: EligibilityQueryPlatform; stageIndex: number; reduceMotion: boolean | null; className?: string }) {
  const stage = scanStages[stageIndex] ?? scanStages[0];
  const progress = ((stageIndex + 1) / scanStages.length) * 100;

  return (
    <section className={cn("overflow-hidden rounded-[28px] border border-white/12 bg-[#080b15]/94 text-left shadow-[0_30px_100px_rgba(0,0,0,.42)] backdrop-blur-xl", className)} aria-live="polite" aria-busy="true">
      <div className="relative overflow-hidden px-4 py-5 sm:px-7 sm:py-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_5%,rgba(67,89,220,.22),transparent_42%),linear-gradient(145deg,rgba(255,255,255,.025),transparent_58%)]" aria-hidden="true" />

        <div className="relative mx-auto h-[190px] max-w-2xl sm:h-[235px]">
          <motion.div className="absolute inset-x-0 top-7 flex justify-center sm:top-9" animate={reduceMotion ? undefined : { y: [0, 3, 0], rotate: [-2.2, -1.2, -2.2] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}>
            <ScanningPassCard kind="founder" className="-translate-x-[13%] -rotate-[5deg] opacity-72" />
          </motion.div>
          <motion.div className="absolute inset-x-0 top-1 flex justify-center" animate={reduceMotion ? undefined : { y: [0, -4, 0], rotate: [2.2, 1.1, 2.2] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
            <ScanningPassCard kind="builder" className="translate-x-[13%] rotate-[5deg]" />
          </motion.div>
          <motion.div className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-[#9eaeff] to-transparent shadow-[0_0_20px_#7895ff]" animate={reduceMotion ? undefined : { y: [22, 185, 22], opacity: [0, 1, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true" />
        </div>

        <div className="relative mx-auto mt-2 max-w-3xl rounded-2xl border border-white/12 bg-[#11141f]/92 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#7895ff]/30 bg-[#5067df]/12 text-[#aab7ff]">
              <GeoSyncLoader size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <motion.p key={stage.title} initial={reduceMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-sm font-semibold text-white sm:text-base">{stage.title}</motion.p>
                  <motion.p key={stage.detail} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs leading-5 text-white/48 sm:text-sm">{stage.detail}</motion.p>
                </div>
                <span className="shrink-0 font-mono text-[9px] font-semibold tracking-[0.1em] text-white/38">0{stageIndex + 1}/0{scanStages.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={`Verification scan phase ${stageIndex + 1} of ${scanStages.length}`} aria-valuenow={stageIndex + 1} aria-valuemin={1} aria-valuemax={scanStages.length}>
            <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-[#4762ed] to-[#91a4ff]" animate={{ width: `${progress}%` }} transition={{ duration: reduceMotion ? 0 : 0.35 }} />
          </div>

          <div className="mt-4 grid grid-cols-5 gap-1.5" aria-hidden="true">
            {scanStages.map((item, index) => (
              <span key={item.title} className={cn("grid h-7 place-items-center rounded-lg border transition-colors", index < stageIndex ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : index === stageIndex ? "border-[#7895ff]/35 bg-[#5067df]/14 text-[#aab7ff]" : "border-white/[0.06] bg-white/[0.025] text-white/22")}>
                {index < stageIndex ? <Check className="size-3" /> : index === stageIndex ? <GeoSyncLoader size={10} /> : <span className="size-1 rounded-full bg-current" />}
              </span>
            ))}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-white/32">Public preview only · {platform === "x" ? "X" : "Discord"} ownership and private Builder checks remain locked until secure sign-in.</p>
        </div>
      </div>
    </section>
  );
}

type FlowState =
  | "waiting"
  | "checking"
  | "completed"
  | "action"
  | "not_eligible"
  | "eligible"
  | "claimed"
  | "unavailable"
  | "failed";

type VerificationStep = {
  title: string;
  detail: string;
  icon: typeof Fingerprint;
  state: FlowState;
};

const statusMeta: Record<FlowState, { label: string; className: string; dot: string }> = {
  waiting: { label: "Waiting", className: "text-white/42", dot: "bg-white/25" },
  checking: { label: "Checking", className: "text-[#aab7ff]", dot: "bg-[#7895ff]" },
  completed: { label: "Complete", className: "text-emerald-300", dot: "bg-emerald-400" },
  action: { label: "Action required", className: "text-amber-200", dot: "bg-amber-300" },
  not_eligible: { label: "Not eligible", className: "text-rose-300", dot: "bg-rose-400" },
  eligible: { label: "Eligible", className: "text-emerald-300", dot: "bg-emerald-400" },
  claimed: { label: "Already claimed", className: "text-sky-300", dot: "bg-sky-400" },
  unavailable: { label: "Provider unavailable", className: "text-amber-200", dot: "bg-amber-300" },
  failed: { label: "Verification failed", className: "text-rose-300", dot: "bg-rose-400" },
};

function pendingSteps(platform: EligibilityQueryPlatform): VerificationStep[] {
  const identity = platform === "x" ? "X" : "Discord";
  return [
    { icon: Fingerprint, title: "Identity lookup", detail: `Checking the ${identity} handle against the Arc Pass registry.`, state: "checking" },
    { icon: BadgeCheck, title: "Founder invitation lookup", detail: "Waiting for the registry response.", state: "waiting" },
    { icon: Github, title: "GitHub account verification", detail: "Runs after secure sign-in and GitHub connection.", state: "waiting" },
    { icon: Clock3, title: "GitHub account age check", detail: "Requires an ownership-verified GitHub account.", state: "waiting" },
    { icon: Code2, title: "GitHub contributions check", detail: "Checks the previous 180 days after GitHub verification.", state: "waiting" },
    { icon: WalletCards, title: "Wallet ownership verification", detail: "Each wallet must sign a unique server nonce.", state: "waiting" },
    { icon: Activity, title: "Arc activity analysis", detail: "Runs only against ownership-verified wallets.", state: "waiting" },
    { icon: MessageCircle, title: "Discord supporting signal", detail: "Membership supports context; it never grants eligibility alone.", state: "waiting" },
    { icon: Blocks, title: "Builder tier calculation", detail: "Calculated from verified Arc transactions.", state: "waiting" },
    { icon: ShieldCheck, title: "Credential readiness", detail: "Combines all required verification signals.", state: "waiting" },
  ];
}

function resultSteps(result: EligibilityResult, platform: EligibilityQueryPlatform): VerificationStep[] {
  const founderStatus = result.founder.status;
  const founderMatched = founderStatus === "eligible";
  const founderClaimed = founderStatus === "claimed";
  const founderState: FlowState = founderClaimed ? "claimed" : founderMatched ? "eligible" : founderStatus === "under_review" ? "action" : "not_eligible";
  const founderDetail = founderClaimed
    ? "A pass already exists for this verified identity."
    : founderMatched
      ? "An active invitation matches this handle. Sign in to prove ownership."
      : founderStatus === "under_review"
        ? "The Founder application is currently under review."
        : "No active Founder invitation matches this handle.";

  return [
    { icon: Fingerprint, title: "Identity lookup", detail: `${platform === "x" ? "X" : "Discord"} registry lookup completed. A username is not ownership proof.`, state: "completed" },
    { icon: BadgeCheck, title: "Founder invitation lookup", detail: founderDetail, state: founderState },
    { icon: Github, title: "GitHub account verification", detail: "Builder verification only: connect GitHub to prove account ownership.", state: "action" },
    { icon: Clock3, title: "GitHub account age check", detail: "Available after GitHub verification; minimum age is 180 days.", state: "waiting" },
    { icon: Code2, title: "GitHub contributions check", detail: "Available after GitHub verification; minimum is 10 contributions in 180 days.", state: "waiting" },
    { icon: WalletCards, title: "Wallet ownership verification", detail: "Connect a wallet and sign its server-issued ownership challenge.", state: "action" },
    { icon: Activity, title: "Arc activity analysis", detail: "Available after at least one wallet is ownership-verified.", state: "waiting" },
    { icon: MessageCircle, title: "Discord supporting signal", detail: platform === "discord" ? "Sign in to confirm this Discord identity and check Arc membership." : "Connect Discord after sign-in to check the supporting membership signal.", state: "action" },
    { icon: Blocks, title: "Builder tier calculation", detail: "Available after GitHub, wallet, and Arc activity checks complete.", state: "waiting" },
    { icon: ShieldCheck, title: "Credential readiness", detail: founderClaimed ? "Your existing credential is available after sign-in." : founderMatched ? "Founder claim can continue after verified identity sign-in." : "Builder eligibility can only be confirmed after login and verification.", state: founderClaimed ? "claimed" : founderMatched ? "action" : "waiting" },
  ];
}

export function EligibilityScanner({
  platform,
  result,
  error,
  onRetry,
  className,
}: {
  platform: EligibilityQueryPlatform;
  result?: EligibilityResult | null;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [scanStage, setScanStage] = useState(0);
  const failed = !!error;
  const unavailable = error instanceof Error && /unavailable|503|network|fetch/i.test(error.message);
  const steps = failed
    ? pendingSteps(platform).map((step, index) => index === 0 ? { ...step, state: unavailable ? "unavailable" as const : "failed" as const, detail: unavailable ? "The eligibility provider is temporarily unavailable. No result was guessed." : "The lookup could not be completed. No result was guessed." } : step)
    : result
      ? resultSteps(result, platform)
      : pendingSteps(platform);

  const resolved = steps.filter((step) => !["waiting", "checking"].includes(step.state)).length;
  const isChecking = !result && !failed;

  useEffect(() => {
    if (!isChecking) return;
    setScanStage(0);
    const interval = window.setInterval(() => {
      setScanStage((current) => Math.min(current + 1, scanStages.length - 1));
    }, 600);
    return () => window.clearInterval(interval);
  }, [isChecking]);

  if (isChecking) {
    return <PendingCardScan platform={platform} stageIndex={scanStage} reduceMotion={reduceMotion} className={className} />;
  }

  return (
    <section className={cn("overflow-hidden rounded-[28px] border border-white/12 bg-[#080b15]/92 text-left shadow-[0_30px_100px_rgba(0,0,0,.42)] backdrop-blur-xl", className)} aria-live="polite" aria-busy={isChecking}>
      <div className="grid lg:grid-cols-[0.42fr_0.58fr]">
        <div className="relative overflow-hidden border-b border-white/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(79,99,255,.26),transparent_38%),linear-gradient(145deg,rgba(255,255,255,.045),transparent_55%)]" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8da2ff]">
              {isChecking ? <GeoSyncLoader size={14} /> : failed ? <CircleAlert className="size-3.5" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
              {isChecking ? "Live verification trace" : failed ? "Trace interrupted" : "Registry response received"}
            </div>
            <h2 className="mt-5 text-2xl font-semibold leading-tight text-balance text-white sm:text-3xl">
              {isChecking ? "Checking what can be verified now." : failed ? "Verification is temporarily unavailable." : "Your public preview is ready."}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              {isChecking
                ? "This panel advances only when the API returns a real state. Private GitHub and wallet checks stay locked until you sign in."
                : failed
                  ? "We did not create eligibility, a tier, or a pass from incomplete data."
                  : "The public lookup is complete. Ownership-sensitive checks correctly remain gated behind secure sign-in."}
            </p>

            <div className="mt-7 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-white/45">Verification coverage</span>
                <span className="font-mono font-semibold tabular-nums text-white">{isChecking ? "LIVE" : `${resolved} / ${steps.length}`}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                {isChecking ? (
                  <motion.div className="h-full w-1/3 rounded-full bg-[#7895ff]" animate={reduceMotion ? undefined : { x: ["-100%", "300%"] }} transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }} />
                ) : (
                  <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-[#4f63ff] to-[#8da2ff]" initial={reduceMotion ? false : { scaleX: 0 }} animate={{ scaleX: resolved / steps.length }} />
                )}
              </div>
            </div>

            {failed && onRetry && (
              <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8da2ff]">
                <RotateCcw className="size-4" aria-hidden="true" /> Retry verification
              </button>
            )}
          </div>
        </div>

        <ol className="divide-y divide-white/[0.07] p-2 sm:p-3" aria-label="Arc Pass verification checks">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const meta = statusMeta[step.state];
            return (
              <li key={step.title} className="group grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-xl px-2 py-3.5 transition-colors hover:bg-white/[0.025] sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:items-center sm:px-3">
                <span className={cn("grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.035]", meta.className)}>
                  {step.state === "checking" ? <GeoSyncLoader size={16} /> : <Icon className="size-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/45">{step.detail}</p>
                </div>
                <span className={cn("col-start-2 inline-flex w-fit items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.11em] sm:col-start-auto", meta.className)}>
                  <span className={cn("size-1.5 rounded-full", meta.dot, step.state === "checking" && "animate-pulse motion-reduce:animate-none")} aria-hidden="true" />
                  {meta.label}
                </span>
                <span className="sr-only">Check {index + 1} of {steps.length}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
