import { useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCheckEligibility, useGetBuilderSupply } from "@workspace/api-client-react";
import type { EligibilityQueryPlatform, EligibilityResult } from "@workspace/api-client-react";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  BookOpen,
  Check,
  Code2,
  Fingerprint,
  Handshake,
  LockKeyhole,
  MessagesSquare,
  Network,
  Presentation,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users2,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { EligibilityChecker } from "@/components/eligibility-checker";
import { EligibilityScanner } from "@/components/eligibility-scanner";
import { EligibilityResults } from "@/components/eligibility-results";
import { MobileCredentialRain } from "@/components/mobile-credential-rain";
import { BuilderPassCard, type BuilderPassCardData } from "@/components/builder-pass-card";
import { FounderPassCard, type FounderPassCardData } from "@/components/founder-pass-card";

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

const BUILDER_PHASE_ONE_SUPPLY = 2_499;

const passBenefits = [
  {
    id: "founder",
    eyebrow: "FOUNDER PASS BENEFITS",
    title: "Support for the company you are building.",
    description: "Invite-verified founders enter a focused support layer built around better decisions, trusted introductions, and long-term discoverability.",
    items: [
      { icon: Rocket, title: "Founder Sprint", body: "Milestone planning, progress reviews, and practical operating support." },
      { icon: Presentation, title: "Pitch & tokenomics review", body: "Structured feedback to sharpen your story, deck, and token design." },
      { icon: Handshake, title: "Investor & advisor access", body: "Curated introductions when your company and materials are ready." },
      { icon: UsersRound, title: "Founder directory", body: "A verified profile that helps the right builders and partners find you." },
      { icon: BookOpen, title: "Playbooks & resources", body: "Templates and operating guides drawn from founders who've shipped before you." },
      { icon: MessagesSquare, title: "Private founder community", body: "A closed space to trade notes with other verified founders building in the ecosystem." },
    ],
  },
  {
    id: "builder",
    eyebrow: "BUILDER PASS BENEFITS",
    title: "Proof for the work you have already done.",
    description: "Builders turn verified GitHub identity and signed-wallet activity into a portable record that can grow with their contribution.",
    items: [
      { icon: BadgeCheck, title: "Verified builder proof", body: "A non-transferable credential linked to proven identity and activity." },
      { icon: TrendingUp, title: "Tier progression", body: "Re-verify as your qualifying work grows and move upward without a new pass." },
      { icon: Code2, title: "Build opportunities", body: "Make your skills and contribution easier to evaluate across the ecosystem." },
      { icon: Network, title: "Ecosystem visibility", body: "Show a consistent reputation signal across communities and partner networks." },
      { icon: Trophy, title: "Recognition & rewards", body: "Top-tier builders surface first for grants, bounties, and partner programs." },
      { icon: Users2, title: "Builder community", body: "A dedicated space to connect with other verified builders and share what you're shipping." },
    ],
  },
] as const;

const founderPassPreview: FounderPassCardData = {
  variant: "premium_black",
  displayName: "Ava Chen",
  username: "avabuilds",
  founderTitle: "Founder & CEO",
  companyName: "Northstar",
  companyIndustry: "Onchain infrastructure",
  founderTier: { name: "Founder", accentColor: "#8da2ff" },
  passNumber: 41,
  network: "arc",
  issuedAt: "2026-07-01T00:00:00.000Z",
  eligibilityStatus: "eligible",
  claimStatus: "minted",
};

const builderPassPreview: BuilderPassCardData = {
  displayName: "Rowan Blake",
  discordUsername: "rowanbuilds",
  builderRole: "Protocol Engineer",
  currentTier: { name: "Diamond", emblemUrl: "/tiers/diamond.png", accentColor: "#7895ff" },
  githubVerified: true,
  githubContributionCount: 284,
  verifiedWalletCount: 3,
  validContractCount: 18,
  discordCommunityMember: true,
  discordCommunityRoles: ["Builders", "Verified"],
  discordCommunityPrimaryRoles: [
    { id: "preview-builder", name: "Builders", hasRole: true },
    { id: "preview-verified", name: "Verified", hasRole: true },
  ],
  passNumber: 128,
  network: "arc",
  lastVerifiedAt: "2026-07-12T00:00:00.000Z",
  eligibilityStatus: "eligible",
  claimStatus: "minted",
};

function HeroEntranceBackdrop({ reduceMotion }: { reduceMotion: boolean | null }) {
  const silhouetteClass = "pointer-events-none absolute bottom-0 left-1/2 h-[78%] w-auto min-w-[900px] max-w-none -translate-x-1/2 object-contain object-bottom sm:h-[88%] sm:min-w-[1250px] lg:h-[94%] lg:min-w-[1500px]";
  const entranceEase = [0.16, 1, 0.3, 1] as const;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true" data-testid="hero-entrance-backdrop">
      <div className="absolute inset-0 bg-[#02030a]" />

      <motion.div
        data-testid="hero-spotlight"
        className="absolute inset-0 origin-top"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.9, ease: entranceEase }}
        style={{ background: "radial-gradient(circle at 50% 26%, #2455ff 0%, #0b2ba5 33%, #030619 64%, #02030a 82%)" }}
      />

      <motion.div
        data-testid="hero-grid-wipe"
        className="absolute inset-0 origin-top opacity-20"
        initial={reduceMotion ? false : { clipPath: "inset(0 0 100% 0)", opacity: 0 }}
        animate={{ clipPath: "inset(0 0 0% 0)", opacity: 0.2 }}
        transition={{ duration: reduceMotion ? 0 : 0.78, delay: reduceMotion ? 0 : 0.12, ease: entranceEase }}
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)", backgroundSize: "72px 72px", maskImage: "linear-gradient(to bottom, black, transparent 78%)" }}
      />

      <motion.div
        data-testid="hero-silhouette-rear"
        className="absolute inset-0"
        initial={reduceMotion ? false : { opacity: 0, y: 120, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.78, delay: reduceMotion ? 0 : 0.28, ease: entranceEase }}
        style={{ clipPath: "inset(0 0 58% 0)" }}
      >
        <img src="/hero/identity-silhouettes.svg" alt="" className={silhouetteClass} width={1600} height={900} />
      </motion.div>

      <motion.div
        data-testid="hero-silhouette-middle"
        className="absolute inset-0"
        initial={reduceMotion ? false : { opacity: 0, y: 170, scale: 0.975 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.82, delay: reduceMotion ? 0 : 0.43, ease: entranceEase }}
        style={{ clipPath: "inset(36% 0 27% 0)" }}
      >
        <img src="/hero/identity-silhouettes.svg" alt="" className={silhouetteClass} width={1600} height={900} />
      </motion.div>

      <motion.div
        data-testid="hero-silhouette-front"
        className="absolute inset-0"
        initial={reduceMotion ? false : { opacity: 0, y: 230, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.88, delay: reduceMotion ? 0 : 0.56, ease: entranceEase }}
        style={{ clipPath: "inset(68% 0 0 0)" }}
      >
        <img src="/hero/identity-silhouettes.svg" alt="" className={silhouetteClass} width={1600} height={900} />
      </motion.div>

      <motion.div
        className="absolute inset-x-[12%] bottom-[8%] h-32 rounded-full bg-[#3157ee]/30 blur-[72px]"
        initial={reduceMotion ? false : { opacity: 0, scaleX: 0.45 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.9, delay: reduceMotion ? 0 : 0.48, ease: entranceEase }}
      />
    </div>
  );
}

function CredentialStory() {
  const storyRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: storyRef,
    offset: ["start 90%", "end 10%"],
  });
  const founderY = useTransform(scrollYProgress, [0, 0.16, 0.38, 0.62, 0.82, 1], [470, 180, 34, -78, -300, -520]);
  const founderRotate = useTransform(scrollYProgress, [0, 0.38, 0.7, 1], [-9, -2, 2, 7]);
  const founderScale = useTransform(scrollYProgress, [0, 0.3, 0.58, 0.82, 1], [0.82, 1, 1, 0.92, 0.78]);
  const founderOpacity = useTransform(scrollYProgress, [0, 0.1, 0.66, 0.86, 1], [0, 1, 1, 0.46, 0]);
  const builderY = useTransform(scrollYProgress, [0, 0.34, 0.52, 0.72, 0.9, 1], [720, 620, 390, 90, 8, -70]);
  const builderRotate = useTransform(scrollYProgress, [0, 0.5, 0.75, 1], [8, 7, 1.5, -2]);
  const builderScale = useTransform(scrollYProgress, [0, 0.5, 0.72, 1], [0.82, 0.88, 1, 1]);
  const builderOpacity = useTransform(scrollYProgress, [0, 0.42, 0.58, 1], [0, 0, 1, 1]);
  const stageGlow = useTransform(scrollYProgress, [0, 0.38, 0.72, 1], [0.18, 0.55, 0.9, 0.55]);

  return (
    <div ref={storyRef} data-testid="credential-story" className="relative mt-12 md:mt-16">
      <div className="grid gap-10 md:grid-cols-[0.68fr_1.32fr] md:gap-7 lg:gap-14">
        <div className="relative z-10">
          <article className="flex min-h-[auto] flex-col justify-center md:min-h-[88vh]">
            <div className="max-w-lg rounded-3xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm sm:p-7 md:border-transparent md:bg-transparent md:p-0 md:backdrop-blur-none">
              <div className="flex items-center gap-3 font-mono text-[11px] font-semibold text-[#8da2ff]">
                <span className="grid size-8 place-items-center rounded-full border border-[#7895ff]/30 bg-[#3157ee]/15 text-white">01</span>
                INVITE VERIFIED
              </div>
              <h3 className="mt-6 text-4xl font-semibold leading-[1.02] text-balance sm:text-5xl">Founder Pass</h3>
              <p className="mt-4 text-base leading-7 text-pretty text-white/60">
                A permanent, non-transferable credential for founders selected through Webcoin Labs. Company context and original issuance stay attached to the proof.
              </p>
              <Link href="/docs" className="mt-6 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:border-[#7895ff]/60 hover:bg-[#3157ee]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8da2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#02030a]">
                Founder rules <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 64, rotate: -4 }}
              whileInView={{ opacity: 1, y: 0, rotate: -2 }}
              viewport={{ once: true, amount: 0.24 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
              className="relative mx-auto mt-8 w-full max-w-[560px] md:hidden"
              aria-hidden="true"
            >
              <div className="absolute -inset-10 -z-10 rounded-full bg-[#3157ee]/25 blur-3xl" />
              <FounderPassCard data={founderPassPreview} interactive={false} />
            </motion.div>
          </article>

          <article className="mt-16 flex min-h-[auto] flex-col justify-center md:mt-0 md:min-h-[88vh]">
            <div className="max-w-lg rounded-3xl border border-[#3157ee]/35 bg-[#0d2a9d]/55 p-5 backdrop-blur-sm sm:p-7 md:border-transparent md:bg-transparent md:p-0 md:backdrop-blur-none">
              <div className="flex items-center gap-3 font-mono text-[11px] font-semibold text-[#8da2ff]">
                <span className="grid size-8 place-items-center rounded-full border border-[#7895ff]/30 bg-[#3157ee]/20 text-white">02</span>
                ACTIVITY VERIFIED
              </div>
              <h3 className="mt-6 text-4xl font-semibold leading-[1.02] text-balance sm:text-5xl">Builder Pass</h3>
              <p className="mt-4 text-base leading-7 text-pretty text-white/60">
                A living credential shaped by signed-wallet activity and qualifying deployments. Re-verify as the work grows and the tier moves with it.
              </p>
              <Link href="/docs" className="mt-6 inline-flex min-h-11 cursor-pointer items-center rounded-full bg-white px-5 text-sm font-semibold text-[#0d2a9d] transition-colors duration-200 hover:bg-[#dfe6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#02030a]">
                Builder tiers <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 64, rotate: 4 }}
              whileInView={{ opacity: 1, y: 0, rotate: 2 }}
              viewport={{ once: true, amount: 0.24 }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
              className="relative mx-auto mt-8 w-full max-w-[560px] md:hidden"
              aria-hidden="true"
            >
              <div className="absolute -inset-10 -z-10 rounded-full bg-[#1745ed]/30 blur-3xl" />
              <BuilderPassCard data={builderPassPreview} interactive={false} />
            </motion.div>
          </article>
        </div>

        <div className="relative hidden md:block" aria-hidden="true">
          <div data-testid="credential-motion-stage" className="sticky top-20 h-[calc(100vh-6rem)] min-h-[500px] max-h-[720px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#070912] shadow-[0_40px_120px_rgba(0,0,0,.55)] lg:rounded-[2.5rem]">
            <motion.div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(49,87,238,.58),transparent_40%),radial-gradient(circle_at_78%_84%,rgba(120,149,255,.22),transparent_36%)]" style={{ opacity: reduceMotion ? 0.55 : stageGlow }} />
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]" />
            <div className="absolute inset-x-[12%] top-[18%] h-[45%] rounded-full bg-[#1745ed]/25 blur-[72px]" />

            <div className="absolute left-5 top-5 z-30 rounded-full border border-white/10 bg-black/45 px-3 py-2 font-mono text-[8px] font-semibold tracking-[0.14em] text-white/60 backdrop-blur-md lg:left-7 lg:top-7 lg:px-4 lg:text-[10px] lg:tracking-[0.18em]">
              SCROLL — CREDENTIALS IN MOTION
            </div>

            <div className="absolute bottom-8 left-6 top-16 w-px bg-white/10 lg:left-8 lg:top-20">
              <motion.div className="h-full origin-top bg-gradient-to-b from-[#8da2ff] via-[#3157ee] to-white" style={{ scaleY: reduceMotion ? 1 : scrollYProgress }} />
            </div>

            <motion.div
              data-testid="founder-pass-preview"
              className="absolute left-1/2 top-[11%] z-10 w-[calc(100%-3.5rem)] max-w-[560px] -translate-x-1/2"
              style={reduceMotion ? { y: 24, rotate: -2, opacity: 1, scale: 0.94 } : { y: founderY, rotate: founderRotate, opacity: founderOpacity, scale: founderScale }}
            >
              <FounderPassCard data={founderPassPreview} interactive={false} />
            </motion.div>

            <motion.div
              data-testid="builder-pass-preview"
              className="absolute left-1/2 top-[8%] z-20 w-[calc(100%-3.5rem)] max-w-[560px] -translate-x-1/2"
              style={reduceMotion ? { y: 150, rotate: 2, opacity: 1, scale: 0.94 } : { y: builderY, rotate: builderRotate, opacity: builderOpacity, scale: builderScale }}
            >
              <BuilderPassCard data={builderPassPreview} interactive={false} />
            </motion.div>

            <div className="absolute inset-x-6 bottom-5 z-30 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[8px] text-white/45 lg:inset-x-8 lg:bottom-7 lg:pt-4 lg:text-[10px]">
              <span>IDENTITY / WALLET / ACTIVITY</span>
              <span className="text-[#8da2ff]">ARC PASS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCredential({ claimed }: { claimed: number }) {
  const reduceMotion = useReducedMotion();
  const safeClaimed = Math.min(Math.max(claimed, 0), BUILDER_PHASE_ONE_SUPPLY);
  const progress = (safeClaimed / BUILDER_PHASE_ONE_SUPPLY) * 100;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: 0.28 }}
      className="mt-5 w-full max-w-3xl rounded-2xl border border-white/10 bg-black/55 p-3 text-left shadow-[0_18px_50px_rgba(0,0,0,.22)] backdrop-blur-md sm:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-[#7895ff]/25 bg-[#5270ff]/15 text-[#93a5ff]">
            <Blocks className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-white">Builder Pass</p>
            <p className="mt-0.5 text-[10px] text-white/45">Phase 1 public allocation</p>
          </div>
        </div>
        <p className="font-mono text-sm font-semibold tabular-nums text-white sm:text-right">
          {safeClaimed.toLocaleString()} <span className="text-white/35">/</span> {BUILDER_PHASE_ONE_SUPPLY.toLocaleString()}
          <span className="ml-2 font-sans text-[10px] font-medium uppercase tracking-wider text-white/40">claimed</span>
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.07]" role="progressbar" aria-label={`${safeClaimed.toLocaleString()} of ${BUILDER_PHASE_ONE_SUPPLY.toLocaleString()} Builder Passes claimed`} aria-valuenow={safeClaimed} aria-valuemin={0} aria-valuemax={BUILDER_PHASE_ONE_SUPPLY}>
        <motion.div
          className="h-full origin-left rounded-full bg-gradient-to-r from-[#315dff] via-[#5270ff] to-[#8da2ff] shadow-[0_0_14px_rgba(82,112,255,.65)]"
          initial={reduceMotion ? { scaleX: progress / 100 } : { scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: reduceMotion ? 0 : 0.75, ease: "easeOut", delay: 0.35 }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3 text-[10px] font-semibold text-white/60 sm:text-xs">
        <span className="inline-flex items-center gap-2"><LockKeyhole className="size-3.5 text-[#a8b4ff]" aria-hidden="true" /> Founder Pass <strong className="text-white">Invite only</strong></span>
        <span className="inline-flex items-center gap-2 text-white/45"><ShieldCheck className="size-3.5 text-[#7895ff]" aria-hidden="true" /> Privacy-safe preview</span>
      </div>
    </motion.div>
  );
}

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const checkEligibility = useCheckEligibility();
  const { data: supply } = useGetBuilderSupply();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<EligibilityResult | null>(null);
  const [scanPlatform, setScanPlatform] = useState<EligibilityQueryPlatform>("x");

  const handleCheck = async ({ identifier, platform }: { identifier: string; platform: EligibilityQueryPlatform }) => {
    setScanning(true);
    setResult(null);
    setScanPlatform(platform);
    try {
      const [data] = await Promise.all([
        checkEligibility.mutateAsync({ data: { identifier, platform } }),
        new Promise<void>((resolve) => window.setTimeout(resolve, 5_200)),
      ]);
      if (import.meta.env.DEV && identifier.trim().replace(/^@/, "").toLowerCase() === "test") {
        window.location.assign(`/api/auth/dev-test/${platform}?returnTo=/dashboard`);
        return;
      }
      setResult(data);
      setScanning(false);
      window.requestAnimationFrame(() => document.getElementById("eligibility-results")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));
    } catch {
      setScanning(false);
    }
  };

  const claimed = supply?.totalClaimed ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-x-clip bg-[#02030a] text-white [color-scheme:dark]">
      <section className="relative isolate flex min-h-[100dvh] overflow-hidden px-4 pb-10 pt-28 sm:px-6 sm:pb-12 sm:pt-32 lg:px-8">
        <HeroEntranceBackdrop reduceMotion={reduceMotion} />
        <MobileCredentialRain />
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
                <motion.div key="scanning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-white/15 bg-[#0a0d17]/95 p-4 shadow-[0_30px_100px_rgba(0,0,0,.5)] backdrop-blur-xl sm:p-7">
                  <EligibilityScanner platform={scanPlatform} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!result && <HeroCredential claimed={claimed} />}
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
          <div className="grid gap-5 sm:gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <p className="font-mono text-xs font-semibold text-[#7895ff]">THE CREDENTIAL SYSTEM</p>
            <h2 className="max-w-4xl text-[2.55rem] font-semibold leading-[1.02] text-balance sm:text-6xl lg:text-7xl">
              One identity. Two ways to prove the work.
            </h2>
          </div>

          <CredentialStory />

          <div id="benefits" className="mt-16 border-t border-white/10 pt-14 sm:mt-20 sm:pt-16">
            <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
              <p className="font-mono text-xs font-semibold text-[#7895ff]">WHAT YOU UNLOCK</p>
              <h3 className="max-w-3xl text-3xl font-semibold leading-tight text-balance sm:text-5xl">Benefits designed for both sides of the ecosystem.</h3>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2 sm:mt-10">
              {passBenefits.map((pass) => (
                <article key={pass.id} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
                  <p className="font-mono text-[11px] font-semibold text-[#8da2ff]">{pass.eyebrow}</p>
                  <h4 className="mt-4 max-w-xl text-2xl font-semibold leading-tight text-balance sm:text-3xl">{pass.title}</h4>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-pretty text-white/55 sm:text-base sm:leading-7">{pass.description}</p>
                  <div className="mt-7 grid gap-3 sm:grid-cols-2">
                    {pass.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-[#070912] p-4">
                          <span className="grid size-9 place-items-center rounded-xl bg-[#1538bd] text-white"><Icon className="size-4" aria-hidden="true" /></span>
                          <h5 className="mt-4 text-sm font-semibold text-balance">{item.title}</h5>
                          <p className="mt-2 text-xs leading-5 text-pretty text-white/50">{item.body}</p>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 flex justify-center sm:mt-12">
              <a
                href="https://webcoinlabs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/85 backdrop-blur-md transition-colors hover:bg-white/[0.08]"
              >
                Learn more about Webcoin Labs <ArrowRight className="size-4" aria-hidden="true" />
              </a>
            </div>
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
            <a href="https://webcoinlabs.com" target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 cursor-pointer items-center rounded-full bg-white px-6 text-sm font-semibold text-[#0b2a9e] transition-colors duration-200 hover:bg-white/90">
              Explore Webcoin Labs <ArrowRight className="ml-2 size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
