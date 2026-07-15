import { motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import { AnalysisProgress } from "@/components/analysis-progress";

const SCAN_MESSAGES = [
  "Locating profile",
  "Reviewing community access",
  "Checking founder eligibility",
  "Reviewing builder activity",
  "Calculating pass status",
  "Preparing credential preview",
];

function SilhouetteCard({ rotate }: { rotate: number }) {
  return (
    <div
      className="relative h-40 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted to-card shadow-md"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(160deg,transparent,rgba(255,255,255,0.05))]" />
      <div className="flex h-full flex-col items-center justify-center gap-2 opacity-40">
        <div className="h-8 w-8 rounded-full border border-current" />
        <div className="h-1.5 w-14 rounded-full bg-current" />
        <div className="h-1.5 w-10 rounded-full bg-current" />
      </div>
      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm">
        <Lock className="h-2.5 w-2.5 text-white" aria-hidden="true" />
      </div>
    </div>
  );
}

export function EligibilityScanner({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={className}>
      <div className="relative mx-auto mb-8 flex h-40 w-full max-w-[220px] items-center justify-center">
        <div className="absolute left-1/2 -translate-x-1/2">
          <SilhouetteCard rotate={-8} />
        </div>
        <div className="absolute left-1/2 translate-x-2">
          <SilhouetteCard rotate={6} />
        </div>

        {!reduceMotion && (
          <motion.div
            className="absolute inset-x-2 h-10 bg-gradient-to-b from-transparent via-primary/25 to-primary/60"
            initial={{ y: "-20%" }}
            animate={{ y: "220%" }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
          />
        )}
      </div>

      <AnalysisProgress messages={SCAN_MESSAGES} active className="mx-auto" />
    </div>
  );
}
