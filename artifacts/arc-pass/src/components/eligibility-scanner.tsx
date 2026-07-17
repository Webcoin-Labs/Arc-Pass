import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Blocks, Check, Database, Fingerprint, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EligibilityQueryPlatform } from "@workspace/api-client-react";

const SCAN_STAGES = [
  {
    icon: Fingerprint,
    title: "Connecting to Arc Pass registry",
    detail: "Opening a privacy-safe, read-only eligibility check.",
  },
  {
    icon: Database,
    title: "Scanning verified databases",
    detail: "Matching this social handle against Founder Pass invitations.",
  },
  {
    icon: ShieldCheck,
    title: "Checking your eligibility",
    detail: "Reviewing claim status without exposing private profile data.",
  },
  {
    icon: Blocks,
    title: "Checking Arc activity readiness",
    detail: "Wallet activity is analysed after login and an ownership signature.",
  },
  {
    icon: Sparkles,
    title: "Building your private result",
    detail: "Preparing your Founder and Builder Pass previews.",
  },
] as const;

function ScannablePass({ kind }: { kind: "founder" | "builder" }) {
  const builder = kind === "builder";
  return (
    <div className={cn(
      "relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl border shadow-[0_22px_70px_rgba(0,0,0,.35)]",
      builder ? "border-[#6a7cff]/30 bg-[linear-gradient(135deg,#172354_0%,#0a102c_58%,#050713_100%)]" : "border-white/15 bg-[linear-gradient(135deg,#211b35_0%,#0d0c14_55%,#030305_100%)]",
    )}>
      <div className={cn("absolute -right-12 -top-16 size-40 rounded-full blur-3xl", builder ? "bg-[#315dff]/30" : "bg-[#8b5cf6]/20")} />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(115deg,transparent_30%,rgba(255,255,255,.11)_48%,transparent_62%)]" />
      <div className="relative flex h-full flex-col justify-between p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/90">Arc Pass</p>
            <p className="mt-1 text-[7px] text-white/40">by Webcoin Labs</p>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-1 text-[7px] font-semibold text-white/65">{builder ? "BUILDER" : "FOUNDER"}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn("grid size-9 place-items-center rounded-xl border", builder ? "border-[#7590ff]/30 bg-[#365aff]/15" : "border-[#a98aff]/25 bg-[#7c3aed]/10")}>
            {builder ? <Blocks className="size-4 text-[#91a6ff]" /> : <ShieldCheck className="size-4 text-[#c6b5ff]" />}
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-1.5 w-4/5 rounded-full bg-white/20" />
            <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[7px] text-white/40">
          <span>PRIVATE PREVIEW</span><span>ARC // 00</span>
        </div>
      </div>
    </div>
  );
}

export function EligibilityScanner({ platform, className }: { platform: EligibilityQueryPlatform; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
    const interval = window.setInterval(() => setStage((current) => Math.min(current + 1, SCAN_STAGES.length - 1)), 1_000);
    return () => window.clearInterval(interval);
  }, [platform]);

  const active = SCAN_STAGES[stage];
  const ActiveIcon = active.icon;
  const progress = ((stage + 1) / SCAN_STAGES.length) * 100;

  return (
    <div className={cn("mx-auto w-full max-w-3xl", className)} role="status" aria-live="polite" aria-label={`Checking ${platform === "x" ? "X" : "Discord"} eligibility`}>
      <div className="relative mx-auto h-[190px] max-w-[430px] sm:h-[230px]">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: -26, rotate: -5 }}
          animate={{ opacity: 0.68, x: 0, rotate: -5 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="absolute left-0 top-7 w-[70%] sm:top-9"
        >
          <ScannablePass kind="founder" />
        </motion.div>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, x: 26, rotate: 5 }}
          animate={{ opacity: 1, x: 0, rotate: 5, y: reduceMotion ? 0 : [0, -4, 0] }}
          transition={{ opacity: { duration: 0.45 }, x: { duration: 0.45 }, y: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
          className="absolute right-0 top-2 w-[70%]"
        >
          <ScannablePass kind="builder" />
        </motion.div>

        {!reduceMotion && (
          <motion.div
            className="pointer-events-none absolute inset-x-4 z-20 h-px bg-[#8da2ff] shadow-[0_0_18px_5px_rgba(82,112,255,.55)]"
            initial={{ top: "12%", opacity: 0 }}
            animate={{ top: ["12%", "88%", "12%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] p-4 text-left backdrop-blur-xl sm:p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#718cff]/80 to-transparent" />
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#718cff]/25 bg-[#5872ff]/10 text-[#9aabff]">
            <AnimatePresence mode="wait">
              <motion.span key={stage} initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.15 }} transition={{ duration: 0.2 }}>
                <ActiveIcon className="size-4" aria-hidden="true" />
              </motion.span>
            </AnimatePresence>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <AnimatePresence mode="wait">
                <motion.p key={active.title} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.18 }} className="text-sm font-semibold text-white sm:text-base">
                  {active.title}
                </motion.p>
              </AnimatePresence>
              <span className="shrink-0 font-mono text-[10px] text-white/40">{String(stage + 1).padStart(2, "0")}/{String(SCAN_STAGES.length).padStart(2, "0")}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p key={active.detail} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="mt-1 text-xs leading-5 text-white/50 sm:text-sm">
                {active.detail}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full origin-left rounded-full bg-gradient-to-r from-[#4966ff] to-[#8da2ff]" animate={{ scaleX: progress / 100 }} transition={{ duration: reduceMotion ? 0 : 0.35, ease: "easeOut" }} />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-1.5" aria-hidden="true">
          {SCAN_STAGES.map((item, index) => (
            <div key={item.title} className={cn("flex h-7 items-center justify-center rounded-lg border transition-colors duration-200", index < stage ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : index === stage ? "border-[#718cff]/30 bg-[#5872ff]/10 text-[#aab7ff]" : "border-white/[0.06] bg-white/[0.025] text-white/20")}>
              {index < stage ? <Check className="size-3" /> : index === stage ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" /> : <span className="size-1 rounded-full bg-current" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
