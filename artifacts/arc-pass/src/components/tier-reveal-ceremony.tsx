import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FastForward, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export type BuilderTierVisual = {
  name: string;
  emblem: string;
  tone: string;
};

type RevealPhase = "scanning" | "awarded" | "unassigned";

export function TierRevealCeremony({
  passId,
  tiers,
  awardedTierName,
  activityScore,
  qualifyingTransactions,
  githubContributions,
  reduceMotion,
  onContinue,
}: {
  passId: number;
  tiers: readonly BuilderTierVisual[];
  awardedTierName: string | null;
  activityScore: number | null;
  qualifyingTransactions: number | null;
  githubContributions: number | null;
  reduceMotion: boolean | null;
  onContinue: () => void;
}) {
  const awardedIndex = useMemo(
    () => tiers.findIndex((tier) => tier.name.toLowerCase() === awardedTierName?.toLowerCase()),
    [awardedTierName, tiers],
  );
  const [phase, setPhase] = useState<RevealPhase>(() => awardedIndex < 0 ? "unassigned" : reduceMotion ? "awarded" : "scanning");
  const [scanIndex, setScanIndex] = useState(0);

  useEffect(() => {
    setScanIndex(0);
    if (awardedIndex < 0) {
      setPhase("unassigned");
      return;
    }
    if (reduceMotion) {
      setScanIndex(awardedIndex);
      setPhase("awarded");
      return;
    }

    setPhase("scanning");
    const sequence = Array.from({ length: 12 }, (_, index) => index % tiers.length).concat(awardedIndex);
    const timers: number[] = [];
    let elapsed = 0;

    sequence.forEach((index, sequenceIndex) => {
      elapsed += 85 + sequenceIndex * 9;
      timers.push(window.setTimeout(() => {
        setScanIndex(index);
        if (sequenceIndex === sequence.length - 1) {
          timers.push(window.setTimeout(() => setPhase("awarded"), 280));
        }
      }, elapsed));
    });

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [awardedIndex, passId, reduceMotion, tiers.length]);

  const selectedTier = tiers[Math.max(0, phase === "awarded" ? awardedIndex : scanIndex)] ?? tiers[0];
  const finishNow = () => {
    if (awardedIndex < 0) return;
    setScanIndex(awardedIndex);
    setPhase("awarded");
  };

  return (
    <motion.section
      key={`tier-reveal-${passId}`}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/10 bg-[#090c16] text-white shadow-[0_30px_100px_rgba(0,0,0,.34)]"
      aria-labelledby="tier-reveal-title"
      data-testid="tier-reveal-ceremony"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{ background: `radial-gradient(circle at 50% 35%, ${selectedTier?.tone ?? "#5270ff"}32, transparent 37%), linear-gradient(145deg, rgba(82,112,255,.12), transparent 48%)` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent" aria-hidden="true" />

      <div className="relative px-5 py-6 sm:px-9 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Verified activity analysis</p>
            <h1 id="tier-reveal-title" className="mt-2 text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
              {phase === "scanning" ? "Calibrating your Builder tier" : phase === "awarded" ? "Rank acquired" : "Analysis complete"}
            </h1>
          </div>
          <span className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            <ShieldCheck className="size-3.5" aria-hidden="true" /> Server verified
          </span>
        </div>

        <div className="mt-7 grid gap-6 sm:grid-cols-[1fr_220px] sm:items-center">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/25 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2" aria-hidden="true">
              {tiers.map((tier, index) => {
                const active = selectedTier?.name === tier.name;
                const acquired = phase === "awarded" && index <= awardedIndex;
                return (
                  <div key={tier.name} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span
                      className="grid size-9 place-items-center rounded-full border transition-all duration-300 sm:size-10"
                      style={{ borderColor: active ? `${tier.tone}aa` : "rgba(255,255,255,.08)", background: active ? `${tier.tone}1f` : "rgba(255,255,255,.025)", boxShadow: active ? `0 0 28px ${tier.tone}35` : "none" }}
                    >
                      <img src={tier.emblem} alt="" className={`size-7 object-contain transition-all duration-300 sm:size-8 ${active || acquired ? "grayscale-0 opacity-100" : "grayscale opacity-25"}`} />
                    </span>
                    <span className={`hidden font-mono text-[8px] uppercase tracking-[0.08em] sm:block ${active ? "text-white" : "text-white/25"}`}>{tier.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-5 grid min-h-44 place-items-center overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-5">
              <div className="pointer-events-none absolute inset-x-5 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden="true" />
              <AnimatePresence mode="popLayout" initial={false}>
                {selectedTier && (
                  <motion.div
                    key={`${phase}-${selectedTier.name}-${scanIndex}`}
                    initial={reduceMotion ? false : { opacity: 0, y: 55, filter: "blur(8px)", scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)", scale: phase === "awarded" ? 1.06 : 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -55, filter: "blur(8px)", scale: 0.9 }}
                    transition={{ duration: phase === "awarded" ? 0.42 : 0.12, ease: "easeOut" }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      animate={phase === "awarded" && !reduceMotion ? { filter: [`drop-shadow(0 0 0 ${selectedTier.tone}00)`, `drop-shadow(0 0 24px ${selectedTier.tone}aa)`, `drop-shadow(0 0 12px ${selectedTier.tone}66)`] } : undefined}
                      transition={{ duration: 0.9 }}
                    >
                      <img src={selectedTier.emblem} alt={`${selectedTier.name} tier emblem`} className="size-24 object-contain sm:size-28" />
                    </motion.div>
                    <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">Builder tier</p>
                    <p className="mt-1 text-2xl font-black uppercase tracking-[0.08em]" style={{ color: selectedTier.tone }}>{selectedTier.name}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${selectedTier?.tone ?? "#5270ff"}, #ffffff)` }}
                initial={{ width: "4%" }}
                animate={{ width: phase === "scanning" ? "78%" : "100%" }}
                transition={{ duration: phase === "scanning" ? 1.8 : 0.35, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <SignalStat label="Activity score" value={activityScore === null ? "—" : `${activityScore}/100`} />
            <SignalStat label="Qualifying Arc tx" value={qualifyingTransactions?.toLocaleString() ?? "—"} />
            <SignalStat label="GitHub · 180 days" value={githubContributions?.toLocaleString() ?? "—"} />
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={phase} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} role="status" aria-live="polite">
                {phase === "awarded" && selectedTier ? (
                  <>
                    <p className="inline-flex items-center gap-2 text-base font-semibold"><Sparkles className="size-4" style={{ color: selectedTier.tone }} aria-hidden="true" /> Congratulations — you acquired {selectedTier.name} tier.</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">Your card will use this verified server result. Continue to review and claim it.</p>
                  </>
                ) : phase === "unassigned" ? (
                  <>
                    <p className="inline-flex items-center gap-2 text-base font-semibold"><CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" /> Your verified analysis is ready.</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">No tier was returned, so Arc Pass will not invent one. Continue to review the result.</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold">Comparing verified contribution signals…</p>
                    <p className="mt-1 text-xs leading-5 text-white/45">Arc activity, GitHub history, and account age are being matched to the tier policy.</p>
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
      <p className="mt-1 text-xl font-bold tracking-[-0.03em] text-white">{value}</p>
    </div>
  );
}
