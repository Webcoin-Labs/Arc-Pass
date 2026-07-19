import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCheckEligibility, useGetBuilderSupply } from "@workspace/api-client-react";
import type { EligibilityQueryPlatform, EligibilityResult } from "@workspace/api-client-react";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  BookOpen,
  Check,
  Fingerprint,
  Handshake,
  LockKeyhole,
  Network,
  Presentation,
  Rocket,
  ShieldCheck,
  TrendingUp,
  Trophy,
  WalletCards,
} from "lucide-react";
import { EligibilityChecker } from "@/components/eligibility-checker";
import { EligibilityScanner } from "@/components/eligibility-scanner";
import { EligibilityResults } from "@/components/eligibility-results";
import { MobileCredentialRain } from "@/components/mobile-credential-rain";
import { PartnerCloud } from "@/components/partner-cloud";
import { BuilderPassCard, type BuilderPassCardData } from "@/components/builder-pass-card";
import { FounderPassCard, type FounderPassCardData } from "@/components/founder-pass-card";
import { FounderRequestDialog } from "@/components/founder-request-dialog";
import { cn } from "@/lib/utils";
import { clearPendingEligibilityIdentity, savePendingEligibilityIdentity } from "@/lib/pending-eligibility";

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
  {
    number: "04",
    icon: Trophy,
    title: "Claim your pass",
    body: "Claim your verified credential, then mint it onchain when you are ready.",
  },
];

const BUILDER_PHASE_ONE_SUPPLY = 2_499;

const benefitJourneys = [
  {
    id: "founder",
    label: "Founder Pass",
    eyebrow: "FOR INVITE-VERIFIED FOUNDERS",
    title: "Build with sharper support.",
    description: "Focused support for better decisions, introductions and growth.",
    stages: [
      {
        icon: Rocket,
        title: "Founder Sprint",
        body: "Milestones, reviews and practical operating support.",
        headline: "Turn the next milestone into a clear plan.",
        features: ["Milestone planning", "Progress reviews", "Operating support"],
      },
      {
        icon: Presentation,
        title: "Sharpen the story",
        body: "Pitch and tokenomics feedback from experienced operators.",
        headline: "Make the company easier to understand.",
        features: ["Pitch review", "Tokenomics review", "Clear feedback"],
      },
      {
        icon: Handshake,
        title: "Open the network",
        body: "Introductions and a verified founder directory.",
        headline: "Be discoverable when the timing is right.",
        features: ["Investor & advisor access", "Founder directory", "Trusted introductions"],
      },
      {
        icon: BookOpen,
        title: "Build with peers",
        body: "Playbooks, resources and a private founder community.",
        headline: "Keep useful experience close.",
        features: ["Playbooks & resources", "Private founder community", "Peer support"],
      },
    ],
  },
  {
    id: "builder",
    label: "Builder Pass",
    eyebrow: "FOR ACTIVITY-VERIFIED BUILDERS",
    title: "Let the work speak first.",
    description: "Verified proof that grows with your contribution.",
    stages: [
      {
        icon: BadgeCheck,
        title: "Verified builder proof",
        body: "A non-transferable record tied to real identity and activity.",
        headline: "Make proven work portable.",
        features: ["Verified identity", "Signed wallets", "Arc activity"],
      },
      {
        icon: TrendingUp,
        title: "Tier progression",
        body: "Re-verify and move upward without replacing the pass.",
        headline: "Let the credential grow with you.",
        features: ["Upward progression", "Re-verification", "One persistent pass"],
      },
      {
        icon: Network,
        title: "Opportunity signal",
        body: "Build opportunities and ecosystem visibility in one signal.",
        headline: "Surface the work that matters.",
        features: ["Build opportunities", "Ecosystem visibility", "Portable reputation"],
      },
      {
        icon: Trophy,
        title: "Recognition & community",
        body: "Recognition, rewards and a verified builder community.",
        headline: "Be seen by the right ecosystem.",
        features: ["Recognition & rewards", "Builder community", "Partner discovery"],
      },
    ],
  },
] as const;

const founderPassPreview: FounderPassCardData = {
  variant: "premium_black",
  displayName: "Rishu",
  username: "rishu",
  xUsername: "rishu",
  avatarUrl: "/mascot/solrishuavatar.png",
  founderTitle: "Founder & CEO",
  companyName: "Webcoin Labs",
  companyIndustry: "Onchain infrastructure",
  companyLogoUrl: "/logo/wl.webp",
  founderTier: { name: "Premier", accentColor: "#8da2ff" },
  passNumber: 7,
  network: "arc",
  issuedAt: "2026-01-14T00:00:00.000Z",
  eligibilityStatus: "eligible",
  claimStatus: "minted",
};

const builderPassPreview: BuilderPassCardData = {
  displayName: "Rishu",
  discordUsername: "rishu",
  discordAvatarUrl: "/mascot/solrishuavatar.png",
  builderRole: "Protocol Engineer",
  currentTier: { name: "Diamond", emblemUrl: "/tiers/diamond.png", accentColor: "#7895ff" },
  githubVerified: true,
  githubContributionCount: 312,
  verifiedWalletCount: 3,
  qualifyingTransactionCount: 187,
  validContractCount: 21,
  builderLevel: 94,
  activityScore: 82,
  activityRank: 456,
  activityRankTotal: 2_499,
  discordCommunityMember: true,
  discordCommunityJoinedAt: "2025-11-02T00:00:00.000Z",
  passNumber: 42,
  network: "arc",
  lastVerifiedAt: "2026-07-10T00:00:00.000Z",
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

type BenefitJourney = (typeof benefitJourneys)[number];
type BenefitStage = BenefitJourney["stages"][number];

function BenefitArtwork({ journey, stage, step, reduceMotion }: { journey: BenefitJourney; stage: BenefitStage; step: number; reduceMotion: boolean | null }) {
  const Icon = stage.icon;

  return (
    <div className="relative min-h-[310px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#080b16] sm:min-h-[380px] lg:min-h-[460px]">
      <motion.div className="absolute -right-24 -top-24 size-80 rounded-[42%] bg-[#3157ee]/25 blur-2xl" animate={reduceMotion ? undefined : { rotate: [0, 18, 0], scale: [1, 1.12, 1] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true" />
      <motion.div className="absolute -bottom-36 -left-24 size-80 rounded-full bg-[#0db8ff]/10 blur-3xl" animate={reduceMotion ? undefined : { x: [0, 34, 0], y: [0, -18, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" aria-hidden="true" />

      <div className="relative flex min-h-[310px] flex-col p-5 sm:min-h-[380px] sm:p-7 lg:min-h-[460px] lg:p-8">
        <div className="flex items-center justify-between">
          <img src="/logo/arcpasslogowhite.webp" alt="Arc Pass by Webcoin Labs" className="h-6 w-auto object-contain sm:h-7" />
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 font-mono text-[9px] tracking-[0.12em] text-white/55 sm:text-[10px]">0{step + 1} / 04</span>
        </div>

        <div className="mt-7 flex gap-1.5" aria-label={`Step ${step + 1} of 4`}>
          {journey.stages.map((item, index) => <span key={item.title} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", index <= step ? "bg-[#6882ff]" : "bg-white/10")} />)}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={`${journey.id}-${stage.title}`} initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, y: -14, scale: 0.985 }} transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.16, 1, 0.3, 1] }} className="my-auto py-7 sm:py-9">
            <div className="relative mx-auto max-w-md">
              <motion.div className="absolute inset-x-7 -top-4 h-24 rounded-[1.4rem] border border-[#7895ff]/15 bg-[#142252]/55" animate={reduceMotion ? undefined : { y: [0, -3, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }} aria-hidden="true" />
              <motion.div className="absolute inset-x-3 -top-2 h-24 rounded-[1.4rem] border border-[#7895ff]/20 bg-[#101b42]/75" animate={reduceMotion ? undefined : { y: [0, -2, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} aria-hidden="true" />
              <div className="relative rounded-[1.5rem] border border-[#7895ff]/25 bg-[linear-gradient(145deg,rgba(36,54,118,.95),rgba(8,11,22,.98)_72%)] p-5 shadow-[0_28px_80px_rgba(12,30,104,.32)] sm:p-7">
                <div className="flex items-start gap-4">
                  <motion.span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#8197ff]/35 bg-[#4e67e8]/15 text-[#b2beff] sm:size-14" animate={reduceMotion ? undefined : { boxShadow: ["0 0 0 rgba(104,130,255,0)", "0 0 28px rgba(104,130,255,.28)", "0 0 0 rgba(104,130,255,0)"] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
                    <Icon className="size-5 sm:size-6" aria-hidden="true" />
                  </motion.span>
                  <div>
                    <p className="font-mono text-[9px] font-semibold tracking-[0.13em] text-[#91a4ff] sm:text-[10px]">{journey.eyebrow}</p>
                    <h5 className="mt-2 max-w-sm text-2xl font-semibold leading-[1.08] text-balance sm:text-3xl">{stage.headline}</h5>
                  </div>
                </div>

                <div className="mt-6 space-y-2.5">
                  {stage.features.map((feature, index) => (
                    <motion.div key={feature} initial={reduceMotion ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduceMotion ? 0 : 0.09 * index }} className="flex min-h-10 items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3.5 text-xs font-medium text-white/68 sm:text-sm">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#6882ff]/15 text-[#9cadff]"><Check className="size-3" aria-hidden="true" /></span>
                      {feature}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function BenefitsJourney() {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<BenefitJourney["id"]>("founder");
  const [activeStep, setActiveStep] = useState(0);
  const activeJourney = benefitJourneys.find((journey) => journey.id === active) ?? benefitJourneys[0];
  const activeStage = activeJourney.stages[activeStep] ?? activeJourney.stages[0];
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start 80%", "end 25%"] });

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    if (reduceMotion) return;
    const nextStep = Math.min(3, Math.max(0, Math.floor(progress * 4)));
    setActiveStep((current) => current === nextStep ? current : nextStep);
  });

  const selectJourney = (id: BenefitJourney["id"]) => {
    setActive(id);
    setActiveStep(0);
  };

  return (
    <div ref={sectionRef} className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] p-5 sm:p-7 lg:p-8">
      <div className="grid gap-7 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-12">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.12em] text-[#7895ff]">WHAT YOU UNLOCK</p>
          <div className="mt-4 grid w-full grid-cols-2 rounded-2xl border border-white/10 bg-black/25 p-1.5" role="tablist" aria-label="Pass benefits">
          {benefitJourneys.map((journey) => (
            <button key={journey.id} type="button" role="tab" aria-selected={active === journey.id} onClick={() => selectJourney(journey.id)} className={cn("min-h-11 rounded-xl px-3 text-sm font-semibold transition-colors", active === journey.id ? "bg-white text-[#070912]" : "text-white/55 hover:bg-white/[0.06] hover:text-white")}>
              {journey.label}
            </button>
          ))}
          </div>

          <p className="mt-7 font-mono text-[10px] font-semibold tracking-[0.12em] text-[#8da2ff]">{activeJourney.eyebrow}</p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight text-balance sm:text-3xl">{activeJourney.title}</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/48">{activeJourney.description}</p>

          <div className="relative mt-6 grid grid-cols-2 gap-2 lg:block">
            <div className="absolute bottom-5 left-[19px] top-5 hidden w-px bg-white/10 lg:block" aria-hidden="true" />
            {activeJourney.stages.map((stage, index) => {
              const Icon = stage.icon;
              const selected = activeStep === index;
              return (
                <button key={stage.title} type="button" aria-current={selected ? "step" : undefined} onClick={() => setActiveStep(index)} className={cn("group relative flex min-h-[70px] w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors lg:min-h-[72px] lg:items-start lg:gap-4 lg:rounded-2xl lg:border-transparent lg:px-1", selected ? "border-[#7895ff]/40 bg-[#3157ee]/10 text-white lg:bg-transparent" : "border-white/[0.07] bg-white/[0.02] text-white/48 hover:border-white/15 hover:text-white/72 lg:bg-transparent")}>
                  <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full border bg-[#070912] transition-all lg:size-10", selected ? "border-[#7895ff]/65 bg-[#3157ee]/20 text-[#aebaff] shadow-[0_0_22px_rgba(74,99,255,.18)]" : "border-white/12 text-white/35 group-hover:border-white/25")}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="lg:pt-1.5">
                    <span className="block text-sm font-semibold leading-tight lg:text-base">{stage.title}</span>
                    <AnimatePresence initial={false}>
                      {selected && <motion.span initial={reduceMotion ? false : { opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={reduceMotion ? undefined : { opacity: 0, height: 0 }} className="mt-1 hidden max-w-sm overflow-hidden text-sm leading-5 text-white/48 lg:block">{stage.body}</motion.span>}
                    </AnimatePresence>
                  </span>
                </button>
              );
            })}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={`${activeJourney.id}-${activeStage.title}-mobile`} initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -4 }} className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3 text-sm leading-5 text-white/52 lg:hidden">
              {activeStage.body}
            </motion.p>
          </AnimatePresence>
        </div>

        <BenefitArtwork journey={activeJourney} stage={activeStage} step={activeStep} reduceMotion={reduceMotion} />
      </div>

      <p className="mt-4 text-center text-[10px] text-white/32 sm:text-[11px]">Scroll or select a step · reduced-motion preferences are respected</p>
    </div>
  );
}

function HeroCredential({ claimed, onRequestFounderPass }: { claimed: number; onRequestFounderPass: () => void }) {
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
            <p className="mt-0.5 text-[10px] text-white/45">Wave 1 onchain mint allocation</p>
          </div>
        </div>
        <p className="text-xs font-semibold tabular-nums text-white sm:text-right">
          Wave 1 onchain mints: <span className="font-mono">{safeClaimed.toLocaleString()} / {BUILDER_PHASE_ONE_SUPPLY.toLocaleString()}</span>
        </p>
      </div>

      <div className="relative mt-3 h-2 overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.07]" role="progressbar" aria-label={`Wave 1 onchain mints: ${safeClaimed.toLocaleString()} of ${BUILDER_PHASE_ONE_SUPPLY.toLocaleString()}`} aria-valuenow={safeClaimed} aria-valuemin={0} aria-valuemax={BUILDER_PHASE_ONE_SUPPLY}>
        <motion.div
          className="relative z-10 h-full origin-left rounded-full bg-gradient-to-r from-[#315dff] via-[#5270ff] to-[#8da2ff] shadow-[0_0_14px_rgba(82,112,255,.5)]"
          initial={reduceMotion ? { scaleX: progress / 100 } : { scaleX: 0 }}
          animate={{ scaleX: progress / 100 }}
          transition={{ duration: reduceMotion ? 0 : 0.75, ease: "easeOut", delay: 0.35 }}
        />
        {!reduceMotion && (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-px z-20 w-[22%] rounded-full bg-gradient-to-r from-transparent via-[#9bafff]/75 to-transparent shadow-[0_0_12px_rgba(82,112,255,.32)]"
            initial={{ left: "-24%", opacity: 0 }}
            animate={{ left: ["-24%", "105%"], opacity: [0, 0.78, 0.78, 0] }}
            transition={{
              duration: 3.2,
              ease: "linear",
              repeat: Infinity,
              repeatDelay: 0.35,
              times: [0, 0.12, 0.86, 1],
            }}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-3 text-[10px] font-semibold text-white/60 sm:text-xs">
        <span className="inline-flex items-center gap-2"><LockKeyhole className="size-3.5 text-[#a8b4ff]" aria-hidden="true" /> Founder Pass <strong className="text-white">Invite only</strong></span>
        <span className="inline-flex items-center gap-2 text-white/45"><ShieldCheck className="size-3.5 text-[#7895ff]" aria-hidden="true" /> Privacy-safe preview</span>
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-white/[0.07] pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-5 text-white/48 sm:text-xs">Think you qualify as a founder?</p>
        <button type="button" onClick={onRequestFounderPass} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#7895ff]/35 bg-[#3157ee]/15 px-3.5 text-xs font-semibold text-[#c5ceff] transition-colors hover:bg-[#3157ee]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8da2ff]">
          Request Founder Pass <ArrowRight className="ml-1.5 size-3.5" aria-hidden="true" />
        </button>
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
  const [scanError, setScanError] = useState<unknown>(null);
  const [founderRequestOpen, setFounderRequestOpen] = useState(false);
  const [lastLookup, setLastLookup] = useState<{ identifier: string; platform: EligibilityQueryPlatform; discriminator?: string } | null>(null);

  useEffect(() => {
    const scrollToHashTarget = () => {
      if (window.location.hash !== "#how-it-works") return;
      window.requestAnimationFrame(() => {
        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "auto", block: "start" });
      });
    };

    scrollToHashTarget();
    window.addEventListener("hashchange", scrollToHashTarget);
    return () => window.removeEventListener("hashchange", scrollToHashTarget);
  }, []);

  const scrollToFlow = (id: string, topOffset: number, delay = 0) => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const target = document.getElementById(id);
        if (!target) return;
        const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - topOffset);
        window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
      });
    }, delay);
  };

  const handleCheck = async ({ identifier, platform, discriminator }: { identifier: string; platform: EligibilityQueryPlatform; discriminator?: string }) => {
    clearPendingEligibilityIdentity();
    setScanning(true);
    setResult(null);
    setScanError(null);
    setScanPlatform(platform);
    setLastLookup({ identifier, platform, discriminator });
    scrollToFlow("check-status", 112);
    try {
      const normalizedIdentifier = identifier.trim().replace(/^@/, "").toLowerCase();
      if (import.meta.env.DEV && normalizedIdentifier === "test") {
        savePendingEligibilityIdentity({ identifier: normalizedIdentifier, platform, discriminator });
        await new Promise<void>((resolve) => window.setTimeout(resolve, 3_000));
        window.location.assign(`/api/auth/dev-test/${platform}?returnTo=/dashboard`);
        return;
      }

      const [data] = await Promise.all([
        checkEligibility.mutateAsync({ data: { identifier, platform, ...(discriminator ? { discriminator } : {}) } }),
        new Promise<void>((resolve) => window.setTimeout(resolve, 3_000)),
      ]);
      savePendingEligibilityIdentity({ identifier: normalizedIdentifier, platform, discriminator });
      setResult(data);
      setScanning(false);
      scrollToFlow("eligibility-results", 24, 260);
    } catch (error) {
      setScanError(error);
      setScanning(false);
    }
  };

  const claimed = supply?.totalMinted ?? 0;

  return (
    <div className="flex flex-1 flex-col overflow-x-clip bg-[#02030a] text-white [color-scheme:dark]">
      <section className="relative isolate flex min-h-[100dvh] items-center overflow-hidden px-4 pb-10 pt-24 sm:px-6 sm:pb-12 sm:pt-28 lg:px-8">
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

          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[0.95] text-balance sm:text-5xl lg:text-6xl xl:text-7xl">
            Claim your place in the Arc ecosystem.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-pretty text-white/68 sm:text-lg sm:leading-8">
            Verify your identity and onchain activity to claim your Builder Pass and your exclusive founder pass.
          </p>

          <div id="check-status" className="mt-7 w-full max-w-4xl scroll-mt-28 sm:mt-8">
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
              {(scanning || Boolean(scanError)) && (
                <motion.div key="scanning" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }} className="mx-auto max-w-5xl">
                  <EligibilityScanner platform={scanPlatform} error={scanError} onRetry={lastLookup ? () => void handleCheck(lastLookup) : undefined} />
                </motion.div>
              )}
              {!scanning && !scanError && result && lastLookup && (
                <motion.div key="locked" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} className="mx-auto max-w-3xl">
                  <div className="flex flex-col gap-2.5 rounded-3xl border border-white/15 bg-[#11131a]/95 p-2 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:rounded-full sm:py-2 sm:pl-5 sm:pr-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5 px-2 sm:px-0">
                      <LockKeyhole className="size-4 shrink-0 text-[#8da2ff]" aria-hidden="true" />
                      <span className="truncate text-sm text-white/75">
                        Checked <strong className="font-semibold text-white">@{lastLookup.identifier}</strong> on {lastLookup.platform === "x" ? "X" : "Discord"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setResult(null); setScanError(null); setLastLookup(null); scrollToFlow("check-status", 112); }}
                      className="min-h-11 shrink-0 cursor-pointer rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10"
                    >
                      Check another
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => scrollToFlow("eligibility-results", 24)}
                    className="mt-3.5 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-white/55 transition-colors hover:text-white/85"
                  >
                    Your preview is ready below — sign in to prove ownership and continue claiming
                    <ArrowRight className="size-3.5 rotate-90" aria-hidden="true" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!result && <HeroCredential claimed={claimed} onRequestFounderPass={() => setFounderRequestOpen(true)} />}
        </motion.div>
      </section>

      <FounderRequestDialog open={founderRequestOpen} onOpenChange={setFounderRequestOpen} />

      <PartnerCloud />

      {result && (
        <section id="eligibility-results" className="scroll-mt-6 border-y border-white/10 bg-[#070912] px-4 py-12 sm:px-6 lg:px-8" aria-label="Eligibility preview result">
          <div className="mx-auto max-w-6xl">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-xs text-[#7895ff]">PRIVATE PREVIEW COMPLETE</p>
                <h2 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">Your Arc Pass status</h2>
              </div>
              <button type="button" onClick={() => { setResult(null); scrollToFlow("check-status", 112); }} className="min-h-11 cursor-pointer self-start rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 sm:self-auto">
                Check another username
              </button>
            </div>
            <EligibilityResults result={result} lookup={lastLookup} variant="immersive" />
            <EligibilityScanner platform={scanPlatform} result={result} className="mt-7" />
          </div>
        </section>
      )}

      <section id="passes" className="bg-[#02030a] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 sm:gap-7 lg:grid-cols-[0.4fr_1.6fr] lg:items-end">
            <p className="font-mono text-xs font-semibold text-[#7895ff]">THE CREDENTIAL SYSTEM</p>
            <h2 className="max-w-6xl text-[2.55rem] font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              One identity.<br />Two ways to prove the work.
            </h2>
          </div>

          <CredentialStory />

          <div id="benefits" className="mt-16 border-t border-white/10 pt-14 sm:mt-20 sm:pt-16">
            <BenefitsJourney />

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

      <section id="how-it-works" className="scroll-mt-24 border-y border-white/10 bg-[#070912] px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold text-[#7895ff]">PROOF BEFORE PROFILE</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight text-balance sm:text-6xl">Verification happens in four deliberate steps.</h2>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-4">
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
