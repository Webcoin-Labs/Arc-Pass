export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 pb-24 pt-16">
      <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
      <p className="mt-2 text-xl text-muted-foreground">Technical details for Arc Pass credentials.</p>

      <div className="mt-10 rounded-2xl border bg-card p-8 shadow-sm">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Arc Pass issues two non-transferable credential families — Founder Pass and Onchain Builder Pass — that serve as verified
          identity primitives: proof of founder status or builder contribution, portable across the ecosystem.
        </p>
      </div>

      <div className="mt-10 space-y-10">
        <section>
          <h2 className="text-2xl font-bold">Credential families</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Founder Pass</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Invite-only and administered by Webcoin Labs. Permanent after issuance — the variant (Normal or Premium Black) and
                founder tier are fixed at mint time and never change.
              </p>
            </div>
            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Onchain Builder Pass</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Activity-based with no permanent contract supply cap. Tier is calculated from ownership-verified wallet activity
                and can move upward through re-verification. Claims open in controlled release phases; Phase 1 allows 2,000.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Claim flow</h2>
          <ol className="mt-4 space-y-3 text-muted-foreground">
            <li>
              <strong className="text-foreground">1. Identity verification</strong> — sign in with X or Discord (OAuth).
            </li>
            <li>
              <strong className="text-foreground">2. Eligibility</strong> — Founder eligibility comes from an admin invitation.
              Onchain Builder eligibility is computed from qualifying transactions and contract deployments across ownership-verified wallets.
            </li>
            <li>
              <strong className="text-foreground">3. Claim</strong> — the credential is linked to your verified identity.
            </li>
            <li>
              <strong className="text-foreground">4. Mint</strong> — you choose a destination wallet, either by connecting one
              directly or entering an address manually, and the credential is recorded onchain.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Onchain Builder tiers</h2>
          <p className="mt-3 text-muted-foreground">
            Tier is calculated using deterministic onchain activity and qualifying contract deployments. An Onchain Builder must have at least one valid deployed contract to qualify for any tier. Exact
            thresholds are not published publicly and are configured internally.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Network</h2>
          <p className="mt-3 text-muted-foreground">
            Passes are issued as non-transferable credentials on the Arc network, with Base also supported as a destination
            network at mint time.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold">Smart contract enforcement</h2>
          <p className="mt-3 text-muted-foreground">
            One-credential-per-identity enforcement, permanence, and tier-upgrade authorization are enforced at the
            contract level via signed, replay-protected authorizations issued by the backend after eligibility checks pass — the
            backend also enforces the configurable release-phase claim limit; the frontend never controls allocation or minting.
          </p>
        </section>
      </div>
    </div>
  );
}
