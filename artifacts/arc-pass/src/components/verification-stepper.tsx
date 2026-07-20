import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerificationStepper({ steps, currentStep, className }: { steps: string[]; currentStep: number; className?: string }) {
  const activeLabel = steps[Math.max(0, Math.min(steps.length - 1, currentStep - 1))];
  return (
    <nav className={cn("w-full", className)} aria-label="Verification progress">
      <div className="rounded-2xl border bg-card/70 p-3.5 shadow-sm sm:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Step {String(currentStep).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}</p>
            <p className="mt-1 truncate text-sm font-semibold">{activeLabel}</p>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary bg-primary/10 font-mono text-[10px] font-semibold text-primary ring-4 ring-primary/5">{String(currentStep).padStart(2, "0")}</span>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1" aria-hidden="true">
          {steps.map((label, index) => <span key={label} className={cn("h-1 rounded-full", index < currentStep ? "bg-primary" : "bg-border")} />)}
        </div>
      </div>
      <ol className="hidden grid-cols-6 sm:grid" aria-label="Progress">
        {steps.map((label, i) => {
          const stepNumber = i + 1;
          const complete = stepNumber < currentStep;
          const active = stepNumber === currentStep;
          return (
            <li key={label} className="relative flex min-w-0 flex-col items-center px-1 text-center">
              {stepNumber > 1 && (
                <span className={cn("absolute right-1/2 top-4 -z-0 h-px w-full transition-colors duration-500", complete || active ? "bg-primary/70" : "bg-border")} aria-hidden="true" />
              )}
              <div
                className={cn(
                  "relative z-10 grid size-8 place-items-center rounded-full border bg-background font-mono text-[10px] font-semibold transition-all duration-300",
                  complete && "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/.2)]",
                  active && !complete && "border-primary text-primary ring-4 ring-primary/10",
                  !active && !complete && "border-border text-muted-foreground",
                )}
                aria-current={active ? "step" : undefined}
              >
                {complete ? <Check className="size-3.5" aria-hidden="true" /> : String(stepNumber).padStart(2, "0")}
              </div>
              <span className={cn("mt-2 max-w-[86px] text-[11px] leading-4", active ? "font-semibold text-foreground" : complete ? "font-medium text-foreground/80" : "text-muted-foreground")}>{label}</span>
              {active && <span className="mt-1 size-1 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
