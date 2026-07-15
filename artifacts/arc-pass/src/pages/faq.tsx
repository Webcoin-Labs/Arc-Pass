import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is Arc Pass?",
    a: "Arc Pass is a verified credential for founders and builders in the Arc ecosystem. It functions as a network identity — a portable, onchain record of verified founder status or builder contribution, not a collectible.",
  },
  {
    q: "How do I claim a Founder Pass?",
    a: "Founder Pass is invite-only and administered by the Webcoin Labs team. If you've been invited, signing in with the invited X or Discord account will surface it automatically on your dashboard.",
  },
  {
    q: "What determines Onchain Builder tier?",
    a: "Your tier is calculated from deterministic activity across ownership-verified wallets. At least one qualifying contract deployment is required. GitHub is not currently part of eligibility.",
  },
  {
    q: "Why don't you show the exact requirements for each tier?",
    a: "Exact thresholds are kept internal to protect the integrity of the verification system. What's public is the criteria we evaluate — verified transactions, contract deployments, and contribution quality — not the specific numbers.",
  },
  {
    q: "Can I upgrade my Onchain Builder tier?",
    a: "Yes. You can re-verify your eligibility once every seven days. If your verified activity qualifies for a higher tier, you can confirm the upgrade — your identity and pass number stay the same, and your tier can only move upward.",
  },
  {
    q: "Is there a limit on Onchain Builder Passes?",
    a: "The Builder Pass contract has no permanent supply cap. Claims open in controlled release phases; Phase 1 allows 2,000 original claims. Re-verification and tier upgrades update the existing pass and never consume another phase allocation.",
  },
  {
    q: "What's the difference between Normal and Premium Black Founder Pass?",
    a: "Both are permanent Founder credentials. The variant is assigned by an administrator before minting and cannot change afterward — Premium Black is reserved for select members of the network.",
  },
  {
    q: "Which networks are supported?",
    a: "Arc Pass credentials are issued on the Arc network, with Base also available. Additional ecosystem support is planned.",
  },
  {
    q: "Can I transfer my pass?",
    a: "No. Founder and Onchain Builder Passes are non-transferable identity credentials, not tradable assets.",
  },
  {
    q: "What if I lose access to my wallet?",
    a: "Your credential remains tied to your verified X or Discord identity, not just a wallet address. Contact Webcoin Labs support for identity re-verification and administrative correction.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-3xl p-6 pb-24 pt-16">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Frequently asked questions</h1>
        <p className="mt-3 text-lg text-muted-foreground">Everything you need to know about Arc Pass.</p>
      </div>

      <Accordion type="multiple" className="w-full rounded-2xl border bg-card p-2 shadow-sm sm:p-4">
        {FAQS.map((item, i) => (
          <AccordionItem value={`item-${i}`} key={item.q} className={i === FAQS.length - 1 ? "border-b-0" : undefined}>
            <AccordionTrigger className="px-2 text-left text-base font-semibold sm:px-4">{item.q}</AccordionTrigger>
            <AccordionContent className="px-2 text-base leading-relaxed text-muted-foreground sm:px-4">{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
