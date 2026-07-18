import { Link } from "wouter";
import { ArrowRight, BadgeCheck, Blocks, Github, ShieldCheck } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is Arc Pass?",
    a: "Arc Pass is a verified credential system for founders and builders. It creates a portable onchain record of verified founder status or builder contribution; it is not a collectible or a tradable asset.",
  },
  {
    q: "How do I claim a Founder Pass?",
    a: "Founder Pass is invite-only and administered by Webcoin Labs. If you were invited, sign in with the matching X or Discord account, connect your GitHub account, review the issued credential, and complete the claim from your dashboard.",
  },
  {
    q: "What benefits come with a Founder Pass?",
    a: "Founder Pass holders can access the Founder Sprint, structured pitch-deck and tokenomics feedback, curated investor or advisor introductions when ready, and a verified profile in the founder directory. Availability can depend on review, readiness, and program capacity.",
  },
  {
    q: "What benefits come with a Builder Pass?",
    a: "Builder Pass provides verifiable builder proof, tier progression through re-verification, stronger ecosystem visibility, and a clearer signal for build opportunities. Your identity and pass number remain consistent as your verified contribution grows.",
  },
  {
    q: "What GitHub account requirements apply?",
    a: "Builder verification requires an authenticated GitHub account at least 180 days old with 10 or more qualifying contributions during the previous 180 days. A manually entered GitHub username never grants eligibility. Founder Pass remains invite-only and admin-controlled.",
  },
  {
    q: "What determines the Onchain Builder tier?",
    a: "Your tier is calculated from real qualifying Arc transactions across ownership-verified wallets. Contract deployments are displayed as a separate verified proof signal. If the RPC or indexer is unavailable, verification pauses instead of guessing.",
  },
  {
    q: "What are the Builder tier thresholds?",
    a: "Bronze requires 2 qualifying Arc transactions, Silver 10, Gold 50, Platinum 100, and Diamond 1,000. Re-verification can only move an existing credential upward.",
  },
  {
    q: "Can I upgrade my Onchain Builder tier?",
    a: "Yes. You can re-verify once every seven days. If your verified activity qualifies for a higher tier, the existing credential is upgraded in place; your identity and pass number stay the same, and the tier can only move upward.",
  },
  {
    q: "Is there a limit on Onchain Builder Passes?",
    a: "The Builder Pass contract has no permanent supply cap. Wave 1 permits 2,499 confirmed original onchain mints. Inventory claims do not consume the allocation; re-verification and tier upgrades update an existing pass without consuming another mint slot.",
  },
  {
    q: "What is the difference between Normal Founder and Premium Founder Pass?",
    a: "Both are permanent Founder credentials. An administrator assigns the Founder type and tier before issuance, and neither can change afterward. Premium Founder is reserved for select members of the network.",
  },
  {
    q: "Which networks are supported?",
    a: "Arc Pass credentials are issued on the configured Arc network. The API fails closed when the Arc RPC, relayer, or deployed credential contracts are unavailable.",
  },
  {
    q: "Can I transfer my pass?",
    a: "No. Founder and Onchain Builder Passes are non-transferable identity credentials, not tradable assets.",
  },
  {
    q: "What if I lose access to my wallet?",
    a: "Your credential is anchored to a verified identity, not only a wallet address. Contact Webcoin Labs support for identity re-verification and an administrative review.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-24 sm:px-6 sm:pt-20">
      <div className="grid gap-8 border-b pb-10 sm:pb-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
        <div>
          <p className="font-mono text-xs font-semibold text-primary">ARC PASS SUPPORT</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-balance sm:text-5xl">Questions, answered clearly.</h1>
        </div>
        <p className="max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg">
          Eligibility, GitHub requirements, pass benefits, upgrades, and the rules behind a permanent credential.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, label: "Founder Pass", value: "Invite verified" },
          { icon: Blocks, label: "Builder Pass", value: "Activity verified" },
          { icon: Github, label: "GitHub baseline", value: "180 days · 10+ contributions" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border bg-card p-4">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-4 text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-balance">{item.value}</p>
            </div>
          );
        })}
      </div>

      <Accordion type="multiple" className="mt-8 w-full rounded-2xl border bg-card px-3 sm:px-5">
        {FAQS.map((item, index) => (
          <AccordionItem value={`item-${index}`} key={item.q} className={index === FAQS.length - 1 ? "border-b-0" : undefined}>
            <AccordionTrigger className="min-h-16 px-1 text-left text-base font-semibold text-balance hover:no-underline sm:px-2">{item.q}</AccordionTrigger>
            <AccordionContent className="px-1 pb-5 text-sm leading-6 text-pretty text-muted-foreground sm:px-2 sm:text-base sm:leading-7">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border bg-muted/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <BadgeCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">Need the technical rules?</p>
            <p className="mt-1 text-sm leading-6 text-pretty text-muted-foreground">Read how identity, wallet signatures, Wave 1 allocation, and pass upgrades work.</p>
          </div>
        </div>
        <Link href="/docs" className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary">
          Read documentation <ArrowRight className="ml-2 size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
