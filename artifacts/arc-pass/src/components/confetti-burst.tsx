import { motion } from "framer-motion";

const CONFETTI_COLORS = ["#5270ff", "#ffd166", "#7de0dc", "#ff8fa3", "#9eb4ff", "#f0bd4e"];

export function ConfettiBurst({ burst, reduceMotion }: { burst: number; reduceMotion: boolean | null }) {
  if (!burst || reduceMotion) return null;
  return (
    <div key={burst} className="pointer-events-none fixed inset-0 z-[70] overflow-hidden" aria-hidden="true">
      {Array.from({ length: 36 }, (_, index) => {
        const left = (index * 97) % 100;
        const delay = ((index * 53) % 40) / 100;
        const duration = 1.7 + ((index * 29) % 80) / 100;
        const size = 6 + ((index * 13) % 8);
        const direction = index % 2 ? 1 : -1;
        return (
          <motion.span
            key={index}
            className="absolute top-[-4%] block rounded-[2px]"
            style={{ left: `${left}%`, width: size, height: size * 0.5 + 3, backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length] }}
            initial={{ y: 0, opacity: 1, rotate: 0, x: 0 }}
            animate={{ y: "112vh", opacity: [1, 1, 0.9, 0], rotate: direction * (200 + ((index * 37) % 340)), x: direction * ((index * 31) % 130) }}
            transition={{ duration, delay, ease: "easeIn" }}
          />
        );
      })}
    </div>
  );
}
