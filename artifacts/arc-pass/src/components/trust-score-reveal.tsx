import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FastForward, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FounderTrustGauge, trustScoreLabel } from "@/components/founder-trust-gauge";
import { founderVariantLabel } from "@/components/founder-pass-variant-badge";

type RevealPhase = "scanning" | "awarded" | "unassigned";

/** Band colours mirror the gauge's four arc segments. */
function bandTone(score: number): string {
  if (score >= 80) return "#46c98b";
  if (score >= 60) return "#8fd07a";
  if (score >= 40) return "#d8d340";
  if (score >= 20) return "#f2a33c";
  return "#e5484d";
}

/**
 * The needle settles rather than jumping: it swings past the target with a
 * decaying amplitude, which reads as a dial coming to rest instead of a
 * slot machine stopping.
 */
function settleSequence(target: number): number[] {
  const steps = 9;
  const swing = Array.from({ length: steps }, (_, index) => {
    const decay = 1 - index / steps;
    const amplitude = Math.round(34 * decay * decay);
    const offset = index % 2 === 0 ? -amplitude : amplitude;
    return Math.max(0, Math.min(100, target + offset));
  });
  return [...swing, target];
}

export function TrustScoreRevealCeremony({
  passId,
  trustScore,
  variant,
  founderTierName,
  passNumber,
  reduceMotion,
  onContinue,
}: {
  passId: number;
  trustScore: number | null;
  variant: "normal" | "premium_black";
  founderTierName: string | null;
  passNumber: number | null;
  reduceMotion: boolean | null;
  onContinue: () => void;
}) {
  const isPremium = variant === "premium_black";
  const hasScore = typeof trustScore === "number";
  const target = hasScore ? trustScore : 0;

  const [phase, setPhase] = useState<RevealPhase>(() =>
    !hasScore ? "unassigned" : reduceMotion ? "awarded" : "scanning",
  );
  const [displayed, setDisplayed] = useState(() => (!hasScore || reduceMotion ? target : 0));

  useEffect(() => {
    if (!hasScore) {
      setPhase("unassigned");
      return;
    }
    if (reduceMotion) {
      setDisplayed(target);
      setPhase("awarded");
      return;
    }

    setPhase("scanning");
    const sequence = settleSequence(target);
    const timers: number[] = [];
    let elapsed = 0;

    sequence.forEach((value, index) => {
      elapsed += 70 + index * 9;
      timers.push(
        window.setTimeout(() => {
          setDisplayed(value);
          if (index === sequence.length - 1) {
            timers.push(window.setTimeout(() => setPhase("awarded"), 220));
          }
        }, elapsed),
      );
    });

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [hasScore, passId, reduceMotion, target]);

  const finishNow = () => {
    if (!hasScore) return;
    setDisplayed(target);
    setPhase("awarded");
  };

  // An unscored pass has no band, so it must not borrow the zero-score red —
  // a red bar next to "your pass is ready" reads as a failure.
  const tone = hasScore ? bandTone(displayed) : "#8fa2c8";
  const band = trustScoreLabel(displayed);

  return (
    <motion.section
      key={`trust-reveal-${passId}`}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/10 bg-[#090c16] text-white shadow-[0_30px_100px_rgba(0,0,0,.34)]"
      aria-labelledby="trust-reveal-title"
      data-testid="trust-score-reveal"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ background: `radial-gradient(circle at 50% 35%, ${tone}30, transparent 37%), linear-gradient(145deg, rgba(82,112,255,.12), transparent 48%)` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden="true" />

      <div className="relative px-5 py-6 sm:px-9 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Founder assessment</p>
            <h1 id="trust-reveal-title" className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
              {phase === "scanning" ? "Calibrating your ecosystem score" : phase === "awarded" ? "Score assigned" : "Assessment pending"}
            </h1>
          </div>
          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Reviewed by Webcoin Labs
          </span>
        </div>

        <div className="mt-7 grid gap-6 sm:grid-cols-[1fr_220px] sm:items-center">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
            <div className="relative grid min-h-56 place-items-center overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-6">
              <div className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />

              {hasScore ? (
                <motion.div
                  className="flex flex-col items-center"
                  animate={phase === "awarded" && !reduceMotion ? { scale: [0.96, 1.05, 1] } : undefined}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <FounderTrustGauge
                    score={displayed}
                    isPremium={isPremium}
                    showCaption={false}
                    glow={phase === "awarded" ? `${tone}55` : null}
                    className="w-[168px] sm:w-[196px]"
                  />
                  <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Founder ecosystem score</p>
                  {/* Keyed on phase, not on the band name: during the sweep the
                      band changes many times a second, and re-mounting it each
                      time leaves overlapping ghosts mid-crossfade. */}
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={phase}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="mt-1 text-2xl font-black uppercase tracking-[0.08em]"
                      style={{ color: tone }}
                    >
                      {band}
                    </motion.p>
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <CheckCircle2 className="size-12 text-emerald-300" aria-hidden="true" />
                  <p className="mt-3 text-lg font-semibold">No score assigned yet</p>
                  <p className="mt-1 max-w-xs text-xs leading-5 text-white/45">
                    Arc Pass will not invent one. Your card stays exactly as it is until a score is reviewed and assigned.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${tone}, #ffffff)` }}
                initial={{ width: "4%" }}
                animate={{ width: phase === "scanning" ? "78%" : "100%" }}
                transition={{ duration: phase === "scanning" ? 1.8 : 0.35, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SignalStat label="Founder type" value={founderVariantLabel(variant)} />
            <SignalStat label="Founder tier" value={founderTierName ?? "—"} />
            <SignalStat label="Pass number" value={passNumber ? `#${String(passNumber).padStart(4, "0")}` : "—"} />
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} role="status" aria-live="polite">
                {phase === "awarded" ? (
                  <>
                    <p className="inline-flex items-center gap-2 text-base font-semibold">
                      <Sparkles className="size-4" style={{ color: tone }} aria-hidden="true" /> Your ecosystem score is {target} — {trustScoreLabel(target)}.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/45">Assigned by Webcoin Labs after review. It appears on your pass and can be updated as your standing changes.</p>
                  </>
                ) : phase === "unassigned" ? (
                  <>
                    <p className="inline-flex items-center gap-2 text-base font-semibold">
                      <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" /> Your pass is ready.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/45">An ecosystem score has not been assigned yet. Continue to review your credential.</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold">Reading your founder assessment…</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">Identity, invitation, and company verification are being matched to your review record.</p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <Button
            size="lg"
            variant={phase === "scanning" ? "outline" : "default"}
            className={`mt-4 h-12 w-full shrink-0 sm:mt-0 sm:w-auto ${phase === "scanning" ? "border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white" : ""}`}
            onClick={phase === "scanning" ? finishNow : onContinue}
          >
            {phase === "scanning" ? <><FastForward className="mr-2 size-4" /> Skip animation</> : <>Continue to your pass <ArrowRight className="ml-2 size-4" /></>}
          </Button>
        </div>
      </div>
    </motion.section>
  );
}

function SignalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      <p className="mt-1 truncate text-xl font-bold tracking-[-0.03em] text-white">{value}</p>
    </div>
  );
}
