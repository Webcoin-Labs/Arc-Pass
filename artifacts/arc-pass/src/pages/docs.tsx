import { Link } from "wouter";
import { ArrowUpRight, BadgeCheck, Github, LockKeyhole, MessageCircle, RefreshCw, ShieldCheck, UserRound, WalletCards } from "lucide-react";

const tierGuide = [
  ["Bronze", "2+", "/tiers/bronze.png"], ["Silver", "10+", "/tiers/silver.png"], ["Gold", "50+", "/tiers/gold.png"], ["Platinum", "100+", "/tiers/platinum.png"], ["Diamond", "1,000+", "/tiers/diamond.png"],
] as const;

export default function DocsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
      <div className="max-w-3xl">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-primary">Arc Pass documentation</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">Verified credentials, explained clearly.</h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">How identity, wallet ownership, eligibility, offchain inventory claims, onchain minting, metadata, and privacy work across Arc Pass.</p>
      </div>

      <nav className="mt-10 flex flex-wrap gap-2" aria-label="Documentation sections">
        {["overview", "founder", "identity", "eligibility", "discord", "tiers", "claiming", "statuses", "reverification", "metadata", "sharing", "troubleshooting", "privacy", "terms"].map((id) => <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium capitalize hover:bg-muted">{id}</a>)}
      </nav>

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <section id="overview" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8 lg:col-span-2">
          <BadgeCheck className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Two non-transferable credential families</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border p-5"><h3 className="font-semibold">Founder Pass</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Invite-only and administered by Webcoin Labs. New invitations use exactly two tiers: Emerging Founder and Premier Founder. Once minted, the credential is permanent and non-transferable.</p></article>
            <article className="rounded-2xl border p-5"><h3 className="font-semibold">Onchain Builder Pass</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Earned from verified developer identity and real Arc activity. The contract has no permanent supply cap; Wave 1 limits original onchain mints to 2,499.</p></article>
          </div>
        </section>

        <section id="founder" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8 lg:col-span-2">
          <UserRound className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Founder invitations, applications, variants, and tiers</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border p-5"><h3 className="font-semibold">Invite-only eligibility</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">A Founder Pass can only be granted through an active administrator invitation matched to an ownership-verified X or Discord identity. A typed username is never an invitation or ownership proof. People without an invitation can send one short in-app Founder Pass request; Webcoin Labs reviews requests manually and contacts applicants directly.</p></div>
            <div className="rounded-2xl border p-5"><h3 className="font-semibold">Two presentation variants</h3><p className="mt-2 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Normal Founder</strong> and <strong className="text-foreground">Premium Founder</strong> control the card presentation selected by an administrator. Variants are separate from tiers and lock when the credential is issued.</p></div>
            <div className="rounded-2xl border p-5 md:col-span-2"><h3 className="font-semibold">Exactly two Founder tiers</h3><p className="mt-2 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Emerging Founder</strong> and <strong className="text-foreground">Premier Founder</strong> are the complete active tier catalog. Founder supply is uncapped and admin-controlled; Founder credentials do not consume the Builder Wave 1 allocation.</p></div>
          </div>
        </section>

        <section id="identity" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Identity verification</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in with X or Discord through OAuth. A typed username is only a privacy-safe registry preview and never proves account ownership. GitHub is connected after login and cannot act as the primary login method.</p>
        </section>

        <section id="eligibility" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <Github className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Builder eligibility</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Requires GitHub ownership verification, an account at least 180 days old, at least 10 GitHub contributions in the previous 180 days, one ownership-verified wallet, and real qualifying Arc activity. Discord membership is a supporting signal, not a substitute.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">If GitHub or the Arc activity provider is unavailable, verification pauses. Arc Pass never guesses transactions, deployments, eligibility, or tier.</p>
        </section>

        <section id="discord" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <MessageCircle className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Discord is supporting evidence</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Discord OAuth is the identity source of truth. Modern usernames and optional legacy <code>#1234</code> discriminators are supported, but a manually typed name never proves server membership. When Discord permits it, Arc Pass records membership and the server join date. Discord alone cannot grant Builder eligibility.</p>
        </section>

        <section id="tiers" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Builder tier thresholds</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">The highest matching tier is calculated from qualifying transactions across ownership-verified wallets. Verified contract deployments are shown independently on the credential.</p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">{tierGuide.map(([name, threshold, emblem]) => <div key={name} className="rounded-2xl border p-4"><img src={emblem} alt="" className="size-9 object-contain" /><p className="mt-2 font-semibold">{name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{threshold} transactions</p></div>)}</div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">The claim page shows the current count, current tier, next tier, remaining requirement, and re-verification availability. A later verified increase upgrades the same credential number in place. Arc Pass never automatically downgrades a Builder tier.</p>
          <Link href="/tiers" className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary hover:underline">Full guide: how passes and tiers work <ArrowUpRight className="size-4" aria-hidden="true" /></Link>
        </section>

        <section id="claiming" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <WalletCards className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Claim, reveal, then mint</h2>
          <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">1. Verify:</strong> complete the required identity and activity checks.</li>
            <li><strong className="text-foreground">2. Claim:</strong> add the pass to your offchain inventory and reveal its verified details.</li>
            <li><strong className="text-foreground">3. Export:</strong> download or share the revealed pass before minting.</li>
            <li><strong className="text-foreground">4. Mint:</strong> choose an ownership-verified destination wallet and record the non-transferable credential onchain.</li>
          </ol>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Inventory claims do not consume Wave 1. Only confirmed original Builder mints count toward “Wave 1 onchain mints: X / 2,499.” Tier upgrades do not consume another slot.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">After claim, each pass has a one-time reveal interaction with a reduced-motion skip path. Returning users see their revealed inventory card immediately. A claimed but unminted credential has no token ID and must not be described as permanent or onchain.</p>
        </section>

        <section id="statuses" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <BadgeCheck className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Pass status glossary</h2>
          <dl className="mt-4 space-y-3 text-sm leading-6">
            <div><dt className="font-semibold">Inventory</dt><dd className="text-muted-foreground">Whether the pass is claimed to your offchain inventory. Claiming is free and never consumes Wave 1.</dd></div>
            <div><dt className="font-semibold">Onchain status</dt><dd className="text-muted-foreground">Whether an original mint is available, including remaining Wave 1 allocation.</dd></div>
            <div><dt className="font-semibold">Reveal</dt><dd className="text-muted-foreground">Concealed until claimed; revealed cards show tier and verified activity.</dd></div>
            <div><dt className="font-semibold">Token ID</dt><dd className="text-muted-foreground">Assigned only after a confirmed mint. Without one, the credential is not yet onchain or permanent.</dd></div>
          </dl>
        </section>

        <section id="reverification" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <RefreshCw className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Re-verification, upgrades, Wave 1, and revocation</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Builder evidence can be re-checked when the displayed re-verification date is reached. New verified transaction activity may move the existing pass upward; it never creates a second Builder Pass or consumes another allocation.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Wave 1 contains 2,499 confirmed original Builder mints. Eligibility checks, previews, inventory claims, failed or reverted transactions, Founder Passes, revocations, and tier upgrades do not count. When Wave 1 is full, eligible users may still claim, reveal, download, and share; only Mint Onchain becomes unavailable.</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Administrators may suspend or revoke a credential for policy or security reasons. Revocation does not erase the historical onchain record, restore a consumed Wave 1 position, or make the credential transferable.</p>
        </section>

        <section id="metadata" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <LockKeyhole className="size-6 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">Onchain records and metadata</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">The contract stores ownership and a metadata URI. Metadata is served from the public Arc Pass API and includes the credential image and public verification URL; a separate IPFS dependency is not required by this implementation. Wallets and explorers can display it when they support Arc and refresh the URI. The contract rejects approvals and transfers, so the credential cannot be sold or moved to another holder.</p>
        </section>

        <section id="sharing" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Download and sharing</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">After revealing a claimed pass, you can export the credential image and share its public verification URL. Direct image posting requests explicit X <code>tweet.write</code> and <code>media.write</code> permission in a one-shot OAuth flow; the user access token is not stored. If that permission, API plan, or provider is unavailable, Arc Pass downloads the image and opens a prefilled X Web Intent so you can attach it manually. Claim and mint messages remain distinct.</p>
        </section>

        <section id="troubleshooting" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Troubleshooting</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li><strong className="text-foreground">OAuth returns an error:</strong> confirm the provider callback exactly matches the production Arc Pass callback URL, then retry in the same browser.</li>
            <li><strong className="text-foreground">GitHub says reconnect:</strong> the authenticated 180-day contribution snapshot is missing or stale. Reconnect GitHub; a manually entered username cannot satisfy the rule.</li>
            <li><strong className="text-foreground">Wallet is connected but unverified:</strong> request a new server nonce and sign the ownership message. Connecting alone never proves ownership.</li>
            <li><strong className="text-foreground">Verification unavailable:</strong> the Arc RPC/indexer or GitHub provider could not be checked. Retry later; Arc Pass does not substitute mock activity, fake zeroes, or a guessed tier.</li>
            <li><strong className="text-foreground">Discord membership unknown:</strong> provider permissions could not confirm membership, join date, or roles. This supporting signal remains unknown and does not become a pass or fail by itself.</li>
            <li><strong className="text-foreground">Direct X posting unavailable:</strong> download the generated card, open the prefilled X post, and attach the image manually.</li>
            <li><strong className="text-foreground">Pass missing from a wallet:</strong> wait for the explorer to index the transaction, confirm the destination wallet and network, then refresh metadata in the wallet.</li>
          </ul>
        </section>

        <section id="privacy" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Privacy</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Public username checks return minimal status only. OAuth tokens, PKCE verifiers, wallet challenge nonces, admin credentials, and internal risk signals are not exposed. OAuth state is short-lived and single-use. Wallet signatures prove address control, are nonce-bound and replay-protected, and do not authorize transactions. Production rejects development mocks and test identities. Missing chain, indexer, OAuth, or storage integrations fail closed with an unavailable state.</p>
        </section>

        <section id="terms" className="scroll-mt-24 rounded-3xl border bg-card p-6 sm:p-8 lg:col-span-2">
          <h2 className="text-2xl font-semibold">Terms and limitations</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Arc Pass is an identity credential, not a financial product, token, investment, ownership interest, or promise of an airdrop. Eligibility and ecosystem benefits may change. Revocation does not make a non-transferable credential transferable. Webcoin Labs may suspend or revoke a credential for fraud, compromised identity, or policy violations while preserving the historical onchain record.</p>
          <div className="mt-6 flex flex-wrap gap-3"><a href="https://www.webcoinlabs.com/docs/legal/terms" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold hover:bg-muted">Terms of Service <ArrowUpRight className="size-4" /></a><a href="https://www.webcoinlabs.com/docs/legal/privacy" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold hover:bg-muted">Privacy Policy <ArrowUpRight className="size-4" /></a><Link href="/faq" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold hover:bg-muted">Read the FAQ <ArrowUpRight className="size-4" /></Link><a href="mailto:contact@webcoinlabs.com" className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold hover:bg-muted">Contact Webcoin Labs <ArrowUpRight className="size-4" /></a></div>
        </section>
      </div>
    </main>
  );
}
