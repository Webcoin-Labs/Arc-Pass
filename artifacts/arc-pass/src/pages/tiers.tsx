import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, BadgeCheck, Blocks, Eye, Fingerprint, RefreshCw, ShieldCheck, Sparkles, WalletCards } from "lucide-react";

const TIERS = [
  { name: "Bronze", threshold: "2+", emblem: "/tiers/bronze.png", tone: "#d18a56", blurb: "First verified proof of real Arc activity." },
  { name: "Silver", threshold: "10+", emblem: "/tiers/silver.png", tone: "#b6c5d8", blurb: "Consistent qualifying transactions across verified wallets." },
  { name: "Gold", threshold: "50+", emblem: "/tiers/gold.png", tone: "#f0bd4e", blurb: "Sustained building with meaningful onchain output." },
  { name: "Platinum", threshold: "100+", emblem: "/tiers/platinum.png", tone: "#7de0dc", blurb: "High-volume contribution recognized across the ecosystem." },
  { name: "Diamond", threshold: "1,000+", emblem: "/tiers/diamond.png", tone: "#9eb4ff", blurb: "The highest verified tier. Reserved for prolific builders." },
] as const;

const LIFECYCLE = [
  { icon: Fingerprint, title: "Verify", body: "Sign in with X or Discord, connect GitHub, and prove ownership of each wallet by signing a unique server challenge. Connecting alone never counts." },
  { icon: BadgeCheck, title: "Claim", body: "Once eligible, claim the pass to your offchain inventory. Claiming is free, does not touch the chain, and does not consume a Wave 1 slot." },
  { icon: Eye, title: "Reveal", body: "A one-time reveal shows your tier and verified activity on the card. Returning visits show the revealed card immediately." },
  { icon: Blocks, title: "Mint onchain", body: "Choose an ownership-verified destination wallet and record the credential on Arc. Only confirmed original Builder mints count toward the Wave 1 limit of 2,499." },
  { icon: RefreshCw, title: "Re-verify & upgrade", body: "When the re-verification window opens, new qualifying activity can move the same pass to a higher tier in place. Tiers never downgrade automatically, and upgrades never consume another Wave 1 slot." },
] as const;

const STATUSES = [
  { label: "Inventory", body: "Whether the pass has been claimed to your offchain inventory. “Claim required” means verification passed but you haven’t claimed yet." },
  { label: "Onchain status", body: "Whether an original onchain mint is currently available for this pass — including whether Wave 1 allocation remains." },
  { label: "Reveal", body: "Concealed until claimed. Revealed cards show tier, activity, and identity details." },
  { label: "Token ID", body: "Assigned by the contract after a confirmed mint. A claimed-but-unminted pass has no token ID and is not yet permanent." },
] as const;

export default function TiersPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <div className="max-w-3xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">How passes work</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">One credential. Five tiers. Earned, not bought.</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">The Onchain Builder Pass is a living, non-transferable credential. Your tier is calculated from qualifying transactions on ownership-verified wallets — and it can only move up.</p>
      </div>

      <section className="mt-12" aria-labelledby="tier-ladder-title">
        <h2 id="tier-ladder-title" className="text-2xl font-semibold">The tier ladder</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Your highest matching tier is assigned automatically during verification. Contract deployments and GitHub contributions appear as separate proof signals on the card.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {TIERS.map((tier) => (
            <article key={tier.name} className="flex flex-col rounded-2xl border p-4" style={{ borderColor: `${tier.tone}55`, background: `linear-gradient(160deg, ${tier.tone}14, transparent 60%)` }}>
              <img src={tier.emblem} alt="" className="size-12 object-contain" />
              <h3 className="mt-3 font-semibold">{tier.name}</h3>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{tier.threshold} Arc transactions</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{tier.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="lifecycle-title">
        <h2 id="lifecycle-title" className="text-2xl font-semibold">From verification to a permanent record</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {LIFECYCLE.map((step, index) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-4" aria-hidden="true" /></span>
                  <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-3 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{step.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-14 grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border bg-card p-6 sm:p-8" aria-labelledby="statuses-title">
          <h2 id="statuses-title" className="text-xl font-semibold">What each pass status means</h2>
          <dl className="mt-4 divide-y">
            {STATUSES.map((status) => (
              <div key={status.label} className="py-3">
                <dt className="text-sm font-semibold">{status.label}</dt>
                <dd className="mt-1 text-sm leading-6 text-muted-foreground">{status.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border bg-card p-6 sm:p-8" aria-labelledby="founder-title">
            <Sparkles className="size-5 text-primary" aria-hidden="true" />
            <h2 id="founder-title" className="mt-4 text-xl font-semibold">And the Founder Pass?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Founder Pass is invite-only and administered by Webcoin Labs, with exactly two tiers: <strong className="text-foreground">Emerging Founder</strong> and <strong className="text-foreground">Premier Founder</strong>. It doesn&rsquo;t use the Builder ladder and never consumes Wave 1 allocation.</p>
          </section>

          <section className="rounded-3xl border bg-card p-6 sm:p-8" aria-labelledby="soulbound-title">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            <h2 id="soulbound-title" className="mt-4 text-xl font-semibold">Soulbound by design</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">The contract rejects approvals and transfers. A minted pass is permanent, non-transferable, and has no monetary, token, or airdrop value — it is proof of work, bound to your identity.</p>
          </section>
        </div>
      </div>

      <section className="mt-10 flex flex-col items-start gap-4 rounded-3xl border bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div>
          <h2 className="text-xl font-semibold">Ready to prove the work?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Verification takes a few minutes. Your tier is calculated automatically.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/claim/builder" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Start verification <ArrowRight className="size-4" aria-hidden="true" /></Link>
          <Link href="/docs" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold hover:bg-muted">Read the docs <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>

      <p className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground"><WalletCards className="size-4" aria-hidden="true" /> Already verified? <Link href="/dashboard" className="font-semibold text-primary hover:underline">View your passes</Link></p>
    </main>
  );
}
