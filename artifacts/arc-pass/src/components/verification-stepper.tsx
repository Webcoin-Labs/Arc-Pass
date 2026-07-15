import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerificationStepper({ steps, currentStep, className }: { steps: string[]; currentStep: number; className?: string }) {
  return (
    <ol className={cn("flex w-full items-center", className)} aria-label="Progress">
      {steps.map((label, i) => {
        const stepNumber = i + 1;
        const complete = stepNumber < currentStep;
        const active = stepNumber === currentStep;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium transition-colors",
                  complete && "border-primary bg-primary text-primary-foreground",
                  active && !complete && "border-primary text-primary",
                  !active && !complete && "border-border text-muted-foreground",
                )}
                aria-current={active ? "step" : undefined}
              >
                {complete ? <Check className="h-3 w-3" aria-hidden="true" /> : stepNumber}
              </div>
              <span className={cn("hidden text-[11px] sm:block", active ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            </div>
            {stepNumber < steps.length && <div className={cn("mx-2 h-px flex-1 transition-colors", complete ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}
