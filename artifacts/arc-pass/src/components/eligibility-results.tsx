import { useLocation } from "wouter";
import { motion } from "motion/react";
import { ArrowRight, Blocks, CircleCheck, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EligibilityResult } from "@workspace/api-client-react";

function ObscuredCredential({ kind, eligible = false }: { kind: "founder" | "builder"; eligible?: boolean }) {
  const founder = kind === "founder";
  return (
    <div
      className={cn(
        "relative aspect-[1.586/1] w-full max-w-[390px] overflow-hidden rounded-[22px] border text-white shadow-[0_24px_65px_rgba(0,0,0,.28)]",
        eligible ? "border-emerald-400/45" : founder ? "border-[#9e82ff]/25" : "border-[#6d85ff]/30",
        founder ? "bg-[linear-gradient(135deg,#1d1830_0%,#0e0d17_50%,#030306_100%)]" : "bg-[linear-gradient(135deg,#1a285f_0%,#0b1438_52%,#040713_100%)]",
      )}
      aria-label={`Private ${founder ? "Founder" : "Onchain Builder"} Pass preview`}
    >
      <div className={cn("absolute -right-16 -top-20 size-56 rounded-full blur-3xl", founder ? "bg-[#8b5cf6]/20" : "bg-[#315dff]/28")} />
      <div className="absolute -bottom-24 -left-12 size-48 rounded-full bg-[#1538bd]/18 blur-3xl" />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(115deg,transparent_30%,rgba(255,255,255,.13)_47%,transparent_63%)]" />
      <div className="absolute -bottom-[65%] left-1/2 aspect-square w-[125%] -translate-x-1/2 rounded-full border border-white/[0.08]" />
      <div className="absolute -bottom-[75%] left-1/2 aspect-square w-[145%] -translate-x-1/2 rounded-full border border-white/[0.05]" />

      <motion.div initial={{ x: "-130%", opacity: 0 }} animate={{ x: "180%", opacity: [0, 0.7, 0] }} transition={{ duration: 1.15, ease: "easeInOut", delay: 0.12 }} className="pointer-events-none absolute inset-y-0 z-20 w-20 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent motion-reduce:hidden" />

      <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="size-7 sm:size-8" width={32} height={32} />
            <div><p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/90 sm:text-[11px]">Arc Pass</p><p className="mt-0.5 text-[7px] text-white/40 sm:text-[8px]">by Webcoin Labs</p></div>
          </div>
          <span className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[7px] font-bold tracking-[0.11em] text-white/70 backdrop-blur-md sm:text-[8px]">{founder ? "FOUNDER PASS" : "BUILDER PASS"}</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn("grid size-11 shrink-0 place-items-center rounded-2xl border sm:size-14", founder ? "border-[#b49cff]/25 bg-[#9a6cff]/10" : "border-[#8ea2ff]/25 bg-[#5270ff]/12")}>
            {founder ? <UserRound className="size-5 text-[#c9b9ff] sm:size-6" aria-hidden="true" /> : <Blocks className="size-5 text-[#9bb0ff] sm:size-6" aria-hidden="true" />}
          </div>
          <div className="min-w-0"><p className="text-sm font-semibold text-white sm:text-base">Private identity</p><p className="mt-1 text-[9px] text-white/45 sm:text-[10px]">Details unlock after ownership verification</p></div>
        </div>

        <div className="flex items-end justify-between gap-3 border-t border-white/10 pt-3">
          <div>
            <p className="font-mono text-[7px] uppercase tracking-[0.16em] text-white/30 sm:text-[8px]">Credential status</p>
            <p className={cn("mt-1 flex items-center gap-1.5 text-[9px] font-semibold sm:text-[10px]", eligible ? "text-emerald-300" : "text-white/65")}>
              {eligible ? <CircleCheck className="size-3" aria-hidden="true" /> : <LockKeyhole className="size-3" aria-hidden="true" />}
              {eligible ? "INVITATION MATCHED" : founder ? "NO INVITATION" : "LOGIN TO ANALYSE"}
            </p>
          </div>
          <div className={cn("grid size-8 place-items-center rounded-full border sm:size-9", eligible ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-300" : "border-white/15 bg-black/20 text-white/70")}>
            {eligible ? <CircleCheck className="size-4" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}
          </div>
        </div>
      </div>
    </div>
  );
}

const founderCopy: Record<string, { label: string; body: string }> = {
  eligible: { label: "Eligible", body: "This username has an active Founder Pass invitation. Log in with this account to prove ownership and claim it." },
  ineligible: { label: "Ineligible", body: "You are ineligible to claim a Founder Pass." },
  under_review: { label: "Under review", body: "A Founder Pass application is currently under review." },
  claimed: { label: "Pass already claimed", body: "Sign in to view your passes." },
  unknown: { label: "Ineligible", body: "You are ineligible to claim a Founder Pass." },
};

export function EligibilityResults({ result, className, variant = "default" }: { result: EligibilityResult; className?: string; variant?: "default" | "immersive" }) {
  const [, setLocation] = useLocation();
  const founder = founderCopy[result.founder.status];
  const founderEligible = result.founder.status === "eligible";
  const founderCanApply = result.founder.status === "ineligible" || result.founder.status === "unknown";
  const builderClaimed = result.builder.status === "claimed";
  const formUrl = (import.meta.env.VITE_FOUNDER_APPLICATION_FORM_URL as string | undefined)?.trim();
  const immersive = variant === "immersive";
  const cardClass = cn(
    "flex flex-col p-5 sm:p-7",
    immersive ? "rounded-3xl border border-white/10 bg-[#0b0e18] text-white shadow-none" : "rounded-3xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(22,30,55,.08)]",
  );

  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={className} aria-live="polite">
      <div className="grid grid-cols-1 gap-5 text-left md:grid-cols-2">
        <article className={cn(cardClass, founderEligible && (immersive ? "border-emerald-400/35 bg-emerald-950/10" : "border-emerald-300"))}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><h3 className={cn("font-semibold", immersive ? "text-white" : "text-slate-950")}>Founder Pass</h3><Badge variant="secondary" className={cn(founderEligible ? "border border-emerald-400/35 bg-emerald-500/15 text-emerald-300" : immersive && "border border-white/10 bg-white/10 text-white")}>{founderEligible && <CircleCheck className="mr-1 size-3.5" aria-hidden="true" />}{founder.label}</Badge></div>
          <ObscuredCredential kind="founder" eligible={founderEligible} />
          {founderEligible && <p className="mt-5 text-lg font-semibold text-balance text-emerald-300">You’re eligible for the Founder Pass.</p>}
          <p className={cn(founderEligible ? "mt-2" : "mt-5", "min-h-10 text-sm leading-6 text-pretty", immersive ? "text-white/60" : "text-slate-600")}>{founder.body}</p>
          {founderCanApply && (
            <p className={cn("mt-2 text-sm leading-6", immersive ? "text-white/60" : "text-slate-600")}>
              You may still apply for a Founder Pass.{' '}
              {formUrl ? (
                <a className={cn("font-semibold underline underline-offset-4 transition-colors", immersive ? "text-white hover:text-[#8ea0ff]" : "text-[#3448e5] hover:text-[#2638bd]")} href={formUrl} target="_blank" rel="noreferrer">
                  Click here
                </a>
              ) : (
                <span className={immersive ? "text-white/40" : "text-slate-400"}>Application link coming soon.</span>
              )}
            </p>
          )}
          {result.founder.status === "eligible" || result.founder.status === "claimed" ? (
            <Button className={cn("mt-4 h-12 w-full", immersive && "rounded-full bg-[#4f63ff] text-white hover:bg-[#4055ef]", founderEligible && "bg-emerald-400 text-emerald-950 hover:bg-emerald-300")} onClick={() => setLocation(result.founder.status === "claimed" ? "/dashboard" : "/claim/founder")}>{founderEligible ? "Log in to verify and claim" : "Log in to your dashboard"} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          ) : null}
        </article>

        <article className={cardClass}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><h3 className={cn("font-semibold", immersive ? "text-white" : "text-slate-950")}>Onchain Builder Pass</h3><Badge variant="secondary" className={cn(immersive && "border border-white/10 bg-white/10 text-white")}>{builderClaimed ? "Pass already claimed" : "Might be eligible"}</Badge></div>
          <ObscuredCredential kind="builder" />
          <p className={cn("mt-5 min-h-10 text-sm leading-6 text-pretty", immersive ? "text-white/60" : "text-slate-600")}>{builderClaimed ? "This pass has already been claimed. Sign in to view your passes." : "You might be eligible for an Onchain Builder Pass. Log in, connect a wallet, and sign the ownership challenge to check."}</p>
          <Button className={cn("mt-4 h-12 w-full", immersive && "rounded-full bg-[#4f63ff] text-white hover:bg-[#4055ef]")} onClick={() => setLocation(builderClaimed ? "/dashboard" : "/claim/builder")}>
            {builderClaimed ? "Log in to your dashboard" : "Log in and connect wallet"} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </article>
      </div>
      <p className={cn("mt-5 flex items-center justify-center gap-2 text-center text-xs leading-5", immersive ? "text-white/45" : "text-slate-500")}><ShieldCheck className="h-4 w-4" aria-hidden="true" />This limited preview contains no personal, company, wallet, tier, or credential details.</p>
    </motion.section>
  );
}
