import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function ArcMascot({ className, compact = false }: { className?: string; compact?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("pointer-events-none relative isolate aspect-square shrink-0 select-none", compact ? "h-16" : "h-24", className)}
      initial={reduceMotion ? false : { opacity: 0, y: -18, rotate: -3 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: [0, -5, 0], rotate: [0, 1.5, 0] }}
      transition={reduceMotion ? { duration: 0.2 } : { opacity: { duration: 0.35 }, y: { duration: 3.8, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 4.6, repeat: Infinity, ease: "easeInOut" } }}
      aria-hidden="true"
    >
      <div className="absolute inset-x-[13%] bottom-[3%] h-[16%] rounded-full bg-[#2455ff]/35 blur-xl" />
      <img src="/mascot/solrishuavatar.png" alt="" className="absolute inset-0 size-full rounded-2xl object-contain drop-shadow-[0_10px_18px_rgba(32,83,255,.35)]" width={384} height={384} />
      <motion.img
        src="/favicon.svg"
        alt=""
        className="absolute left-1/2 top-[14%] z-10 size-[28%] -translate-x-1/2 rounded-full shadow-[0_0_12px_rgba(137,170,255,.65)]"
        animate={reduceMotion ? undefined : { filter: ["brightness(1)", "brightness(1.25)", "brightness(1)"] }}
        transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        width={64}
        height={64}
      />
    </motion.div>
  );
}
