import { motion, useReducedMotion } from "motion/react";
import bitbrawlOptimized from "../../../../public/optimized/bitbrawl-logo.webp?url";

const partnerAssets = import.meta.glob(["../../../../public/partners/*", "!../../../../public/partners/Bitbrawl_Logo.png"], {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const ecosystemLogoAssets = import.meta.glob([
  "../../../../public/logo/Base_lockup_white.svg",
  "../../../../public/logo/Bitcoin.svg",
  "../../../../public/logo/circle-logo-ondark.svg",
  "../../../../public/logo/logo-zama-typowhite.svg",
  "../../../../public/logo/Solana (SOL).svg",
], {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

function readableName(path: string): string {
  const file = path.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "Partner";
  return file
    .replace(/[-_+]+/g, " ")
    .replace(/\b(full|logo|rgb|dark|black|white|seeklogo|photoroom|removebg|preview)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || "Partner";
}

export function PartnerCloud() {
  const reduceMotion = useReducedMotion();
  const partners = [
    ...Object.entries(partnerAssets),
    ...Object.entries(ecosystemLogoAssets),
    ["../../../../public/partners/Bitbrawl_Logo.png", bitbrawlOptimized] as const,
  ].sort(([a], [b]) => readableName(a).localeCompare(readableName(b)));

  if (!partners.length) return null;

  const track = reduceMotion ? partners : [...partners, ...partners];

  return (
    <section id="partners" className="scroll-mt-24 border-y border-white/10 bg-[#050710] px-4 py-16 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="partners-title">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8da2ff]">Ecosystem context</p>
          <h2 id="partners-title" className="mt-4 text-3xl font-semibold leading-tight text-balance text-white sm:text-5xl">Built in conversation with a global builder ecosystem.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/52 sm:text-base">Organizations represented in the Webcoin Labs network and programs. Logos are shown for attribution, not as a claim of credential endorsement.</p>
        </div>
      </div>

      <div className="mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <motion.div
          className="flex w-max gap-3"
          animate={reduceMotion ? undefined : { x: ["-50%", "0%"] }}
          transition={reduceMotion ? undefined : { duration: Math.max(partners.length * 2.2, 24), repeat: Infinity, ease: "linear" }}
        >
          {track.map(([path, src], index) => (
            <div key={`${path}-${index}`} className="flex h-24 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:h-28 sm:w-48">
              <img src={src} alt={readableName(path)} loading="lazy" decoding="async" className="max-h-12 w-auto max-w-full object-contain brightness-0 invert opacity-70 transition duration-200 hover:opacity-100 sm:max-h-14" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
