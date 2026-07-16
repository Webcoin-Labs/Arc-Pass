import { useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCheckEligibility, useGetBuilderSupply } from "@workspace/api-client-react";
import type { EligibilityQueryPlatform, EligibilityResult } from "@workspace/api-client-react";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Check,
  Fingerprint,
  LockKeyhole,
  WalletCards,
} from "lucide-react";
import { EligibilityChecker } from "@/components/eligibility-checker";
import { EligibilityScanner } from "@/components/eligibility-scanner";
import { EligibilityResults } from "@/components/eligibility-results";
import { MobileCredentialRain } from "@/components/mobile-credential-rain";

const verificationSteps = [
  {
    number: "01",
    icon: Fingerprint,
    title: "Verify the person",
    body: "Sign in with X or Discord to prove the social identity belongs to you.",
  },
  {
    number: "02",
    icon: WalletCards,
    title: "Verify every wallet",
    body: "Sign a unique server challenge for each address. Connecting alone never counts.",
  },
  {
    number: "03",
    icon: Blocks,
    title: "Analyse the work",
    body: "Qualifying deployments and activity determine Builder eligibility and tier.",
  },
];

function HeroCredential({ claimed, remaining, phaseName }: { claimed: number; remaining: number; phaseName: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.28 }}
      className="mt-5 flex flex-wrap items-center justify-center gap-2.5"
    >
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-semibold text-white/85 backdrop-blur-md">
        <BadgeCheck className="size-3.5 text-[#7895ff]" aria-hidden="true" />
        {claimed.toLocaleString()} claimed in {phaseName}
      </span>
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-semibold text-white/85 backdrop-blur-md">
        <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        {remaining.toLocaleString()} {phaseName} claims remain
      </span>
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-xs font-semibold text-white/85 backdrop-blur-md">
        <LockKeyhole className="size-3.5 text-[#7895ff]" aria-hidden="true" />
        Privacy-safe preview
      </span>
    </motion.div>
  );
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const checkEligibility = useCheckEligibility();
  const { data: supply } = useGetBuilderSupply();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);

  const handleCheck = ({ identifier, platform }: { identifier: string; platform: EligibilityQueryPlatform }) => {
    setScanning(true);
    setResult(null);
    checkEligibility.mutate(
      { data: { identifier, platform } },
      {
        onSuccess: (data) => {
          setResult(data);
          setScanning(false);
          window.requestAnimationFrame(() => document.getElementById("eligibility-results")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));
        },
        onError: () => setScanning(false),
      },
    );
  };

  const claimed = supply?.totalClaimed ?? 0;
  const phaseName = supply?.phaseName ?? "Wave 1";
  const remaining = supply?.remainingClaims ?? 2499;

  return (
    <div className="flex flex-1 flex-col bg-[#02030a] text-white [color-scheme:dark]">
      <section className="relative isolate flex min-h-[100dvh] overflow-hidden px-4 pb-10 pt-28 sm:px-6 sm:pb-12 sm:pt-32 lg:px-8">
        <div className="absolute inset-0 z-0 bg-[#02030a]" aria-hidden="true" />
        <div
          className="absolute inset-0 z-0"
          style={{ background: "radial-gradient(circle at 50% 26%, #2455ff 0%, #0b2ba5 33%, #030619 64%, #02030a 82%)" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 z-0 opacity-20"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 78%)" }}
          aria-hidden="true"
        />
        <MobileCredentialRain />
        <motion.img
          src="/hero/identity-silhouettes.svg"
          alt=""
          initial={reduceMotion ? false : { opacity: 0, scale: 1.025 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 h-[78%] w-auto min-w-[900px] max-w-none -translate-x-1/2 object-contain object-bottom sm:h-[88%] sm:min-w-[1250px] lg:h-[94%] lg:min-w-[1500px]"
          width={1600}
          height={900}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48 bg-gradient-to-t from-[#02030a] to-transparent" aria-hidden="true" />

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
          className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center text-center"
        >
          <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/85 backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-[#8ca3ff]" aria-hidden="true" />
            Verified identity for founders and onchain builders
          </p>

          <h1 className="mt-7 max-w-5xl text-5xl font-semibold leading-[0.92] text-balance sm:text-7xl lg:text-8xl xl:text-9xl">
            Proof that moves with you.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-pretty text-white/68 sm:text-lg sm:leading-8">
            Turn verified identity, signed wallets, and real onchain work into a credential the ecosystem can trust.
          </p>

          <div id="check-status" className="mt-8 w-full max-w-4xl scroll-mt-28 sm:mt-10">
            <AnimatePresence mode="wait">
              {!scanning && !result && (
                <motion.div
                  key="checker"
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <EligibilityChecker onSubmit={handleCheck} isPending={checkEligibility.isPending} variant="immersive" />
                </motion.div>
              )}
              {scanning && (
                <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-[#11131a]/95 p-7 shadow-2xl backdrop-blur-xl">
                  <EligibilityScanner />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!result && <HeroCredential claimed={claimed} remaining={remaining} phaseName={phaseName} />}
        </motion.div>
      </section>

      {result && (
        <section id="eligibility-results" className="scroll-mt-20 border-y border-white/10 bg-[#070912] px-4 py-12 sm:px-6 lg:px-8" aria-label="Eligibility preview result">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs text-[#7895ff]">PRIVATE PREVIEW COMPLETE</p>
                <h2 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">Your Arc Pass status</h2>
              </div>
              <button type="button" onClick={() => { setResult(null); window.requestAnimationFrame(() => document.getElementById("check-status")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" })); }} className="min-h-11 cursor-pointer self-start rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 sm:self-auto">
                Check another username
              </button>
            </div>
            <EligibilityResults result={result} variant="immersive" />
          </div>
        </section>
      )}

      <section className="border-b border-white/10 bg-[#070912] px-4 py-5 sm:px-6 lg:px-8" aria-label="Arc Pass verification sequence">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Identity matched", "Wallet ownership signed", "Activity analysed", "Credential issued"].map((item, index) => (
            <div key={item} className="flex min-h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-4 text-xs font-semibold text-white/65">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#1538bd] font-mono text-[10px] text-white">{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="passes" className="bg-[#02030a] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <p className="font-mono text-xs font-semibold text-[#7895ff]">THE CREDENTIAL SYSTEM</p>
            <h2 className="max-w-4xl text-4xl font-semibold leading-tight text-balance sm:text-6xl lg:text-7xl">
              One identity. Two ways to prove the work.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <motion.article
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative min-h-[440px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0e18] p-6 sm:p-9"
            >
              <div className="absolute right-5 top-5 grid size-24 place-items-center rounded-3xl border border-white/10 bg-white/5 sm:size-32">
                <img src="/favicon.svg" alt="Arc Pass mark" className="size-14 sm:size-20" width={80} height={80} />
              </div>
              <p className="font-mono text-xs text-[#7895ff]">01 / INVITE VERIFIED</p>
              <h3 className="mt-5 max-w-xs text-4xl font-semibold text-balance sm:text-5xl">Founder Pass</h3>
              <div className="absolute inset-x-6 bottom-7 sm:inset-x-9 sm:bottom-9">
                <p className="max-w-md text-base leading-7 text-pretty text-white/60">A permanent, non-transferable founder credential administered by Webcoin Labs and fixed at original issuance.</p>
                <Link href="/docs" className="mt-6 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-white hover:text-[#8ca3ff]">Founder rules <ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link>
              </div>
            </motion.article>

            <motion.article
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
              className="relative min-h-[440px] overflow-hidden rounded-[2rem] border border-[#3157ee] bg-[#0d2a9d] p-6 sm:p-9"
            >
              <img src="/tiers/diamond.png" alt="Diamond Builder tier emblem" className="absolute right-2 top-3 size-32 object-contain sm:right-6 sm:top-5 sm:size-40" width={160} height={160} />
              <p className="font-mono text-xs text-white/60">02 / ACTIVITY VERIFIED</p>
              <h3 className="mt-5 max-w-xs text-4xl font-semibold text-balance sm:text-5xl">Builder Pass</h3>
              <div className="absolute inset-x-6 bottom-7 sm:inset-x-9 sm:bottom-9">
                <p className="max-w-md text-base leading-7 text-pretty text-white/70">A tiered credential based on signed-wallet activity and qualifying deployments. The contract has no permanent supply cap; claims open in controlled release phases.</p>
                <Link href="/docs" className="mt-6 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-white hover:text-white/70">Builder tiers <ArrowRight className="ml-2 size-4" aria-hidden="true" /></Link>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-[#070912] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold text-[#7895ff]">PROOF BEFORE PROFILE</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-balance sm:text-6xl">Verification happens in three deliberate steps.</h2>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {verificationSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.number}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: index * 0.05 }}
                  className="min-h-[300px] rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-[#1538bd] text-white"><Icon className="size-5" aria-hidden="true" /></span>
                    <span className="font-mono text-xs text-white/35">{step.number}</span>
                  </div>
                  <h3 className="mt-16 text-2xl font-semibold text-balance">{step.title}</h3>
                  <p className="mt-3 max-w-sm text-base leading-7 text-pretty text-white/55">{step.body}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#1745ed] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="font-mono text-xs font-semibold text-white/65">BUILT AND OPERATED BY</p>
            <img src="/brand/webcoin-mono-white.webp" alt="Webcoin Labs" className="mt-4 h-6 w-auto max-w-52 object-contain object-left sm:h-8 sm:max-w-64" />
            <h2 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] text-balance sm:text-7xl">Reputation infrastructure for the onchain world.</h2>
          </div>
          <div className="lg:text-right">
            <p className="max-w-lg text-lg leading-8 text-pretty text-white/75 lg:ml-auto">Arc Pass makes earned identity portable without turning public usernames into proof or connected addresses into assumptions.</p>
            <a href="https://webcoin.labs" target="_blank" rel="noreferrer" className="mt-7 inline-flex min-h-12 cursor-pointer items-center rounded-full bg-white px-6 text-sm font-semibold text-[#0b2a9e] transition-colors duration-200 hover:bg-white/90">
              Explore Webcoin Labs <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
