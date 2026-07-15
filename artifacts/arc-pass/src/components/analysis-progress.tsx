import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rotates through status messages while `active` is true. The rotation
 * never blocks or extends the real operation — it's cosmetic pacing for
 * whatever the actual request takes, not a fake fixed-length delay.
 */
export function AnalysisProgress({ messages, active, className }: { messages: string[]; active: boolean; className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    setIndex(0);
    const interval = setInterval(() => {
      setIndex((prev) => Math.min(prev + 1, messages.length - 1));
    }, 1100);
    return () => clearInterval(interval);
  }, [active, messages.length]);

  return (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)} role="status" aria-live="polite">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <Loader2 className="h-7 w-7 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      </div>
      <div className="h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={messages[index]}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-sm font-medium text-muted-foreground"
          >
            {messages[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      <span className="sr-only">{messages[index]}</span>
    </div>
  );
}
