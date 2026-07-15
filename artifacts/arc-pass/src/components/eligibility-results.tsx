import { useLocation } from "wouter";
import { motion } from "motion/react";
import { ArrowRight, CircleCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EligibilityResult } from "@workspace/api-client-react";

function ObscuredCredential({ kind, eligible = false }: { kind: "founder" | "builder"; eligible?: boolean }) {
  return (
    <div className={cn("relative aspect-[1.58/1] w-full max-w-[320px] overflow-hidden rounded-2xl border", eligible ? "border-emerald-400/35 bg-emerald-950/30" : kind === "founder" ? "border-white/10 bg-slate-950" : "border-white/10 bg-[#121c2f]")} aria-label={`Obscured ${kind === "founder" ? "Founder" : "Onchain Builder"} Pass placeholder`}>
      <div className="absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_10%,rgba(118,87,255,.35),transparent_36%),linear-gradient(135deg,transparent,rgba(255,255,255,.05))]" />
      <div className="absolute inset-0 backdrop-blur-xl" />
      <div className="relative flex h-full flex-col justify-between p-5 text-white/55 blur-[2px]" aria-hidden="true">
        <div className="h-2 w-24 rounded-full bg-white/20" />
        <div className="space-y-2"><div className="h-7 w-32 rounded-lg bg-white/15" /><div className="h-2 w-20 rounded bg-white/10" /></div>
        <div className="flex gap-2"><div className="h-6 flex-1 rounded bg-white/10" /><div className="h-6 w-14 rounded bg-white/10" /></div>
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn("grid size-12 place-items-center rounded-full border", eligible ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-300" : "border-white/20 bg-black/35 text-white")}>
          {eligible ? <CircleCheck className="size-5" aria-hidden="true" /> : <LockKeyhole className="size-5" aria-hidden="true" />}
        </span>
      </div>
    </div>
  );
}

const founderCopy: Record<string, { label: string; body: string }> = {
  eligible: { label: "Eligible", body: "This username has an active Founder Pass invitation. Log in with this account to prove ownership and claim it." },
  ineligible: { label: "Not currently eligible", body: "Apply for Founder Pass review by Webcoin Labs." },
  under_review: { label: "Under review", body: "A Founder Pass application is currently under review." },
  claimed: { label: "Pass already claimed", body: "Sign in to view your passes." },
  unknown: { label: "No invitation found", body: "Founder Pass is invite-only. You can apply for review." },
};

export function EligibilityResults({ result, className, variant = "default" }: { result: EligibilityResult; className?: string; variant?: "default" | "immersive" }) {
  const [, setLocation] = useLocation();
  const founder = founderCopy[result.founder.status];
  const founderEligible = result.founder.status === "eligible";
  const builderClaimed = result.builder.status === "claimed";
  const formUrl = import.meta.env.VITE_FOUNDER_APPLICATION_FORM_URL as string | undefined;
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
          {result.founder.status === "eligible" || result.founder.status === "claimed" ? (
            <Button className={cn("mt-4 h-12 w-full", immersive && "rounded-full bg-[#4f63ff] text-white hover:bg-[#4055ef]", founderEligible && "bg-emerald-400 text-emerald-950 hover:bg-emerald-300")} onClick={() => setLocation(result.founder.status === "claimed" ? "/dashboard" : "/claim/founder")}>{founderEligible ? "Log in to verify and claim" : "Log in to your dashboard"} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
          ) : formUrl ? (
            <Button variant="outline" className={cn("mt-4 h-12 w-full", immersive && "rounded-full border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white")} asChild><a href={formUrl} target="_blank" rel="noreferrer">Apply for Founder Pass review <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></a></Button>
          ) : <Button variant="outline" className={cn("mt-4 h-12 w-full", immersive && "rounded-full border-white/15 bg-transparent text-white")} disabled>Applications opening soon</Button>}
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
