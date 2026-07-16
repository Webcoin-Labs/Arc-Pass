import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Fingerprint, WalletCards } from "lucide-react";

const fragments = [
  { left: "2%", delay: 0.2, duration: 9.5, rotate: 9, icon: Fingerprint, label: "IDENTITY" },
  { left: "65%", delay: 2.2, duration: 11.5, rotate: -8, icon: WalletCards, label: "SIGNED" },
  { left: "27%", delay: 5.1, duration: 13, rotate: 5, icon: BadgeCheck, label: "VERIFIED" },
];

export function MobileCredentialRain() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden sm:hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#7290ff]/30 to-transparent" />
      <div className="absolute left-1/2 top-[8%] size-56 -translate-x-1/2 rounded-full bg-[#2756ff]/20 blur-3xl" />
      {fragments.map(({ left, delay, duration, rotate, icon: Icon, label }, index) => (
        <motion.div
          key={label}
          className="absolute top-0 w-28 rounded-2xl border border-white/15 bg-[#0a1024]/45 p-3 shadow-[0_18px_50px_rgba(16,45,150,.3)] backdrop-blur-md"
          style={{ left }}
          initial={reduceMotion ? { opacity: 0.12, y: `${18 + index * 26}dvh`, rotate } : { opacity: 0, y: -140, rotate }}
          animate={reduceMotion ? undefined : { opacity: [0, 0.2, 0.14, 0], y: ["-18dvh", "30dvh", "76dvh", "118dvh"], rotate: [rotate, -rotate * 0.35, rotate * 0.6, -rotate] }}
          transition={reduceMotion ? undefined : { duration, delay, repeat: Infinity, ease: "linear", times: [0, 0.15, 0.78, 1] }}
        >
          <div className="flex items-center justify-between">
            <span className="grid size-7 place-items-center rounded-lg border border-white/10 bg-[#3157ee]/30 text-[#a9b8ff]"><Icon className="size-3.5" /></span>
            <img src="/favicon.svg" alt="" className="size-5 opacity-70" width={20} height={20} />
          </div>
          <div className="mt-5 h-1.5 w-14 rounded-full bg-white/15" />
          <p className="mt-2 font-mono text-[8px] tracking-[0.18em] text-white/35">{label}</p>
        </motion.div>
      ))}
    </div>
  );
}
