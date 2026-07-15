# Arc Pass refactor plan

## Audit findings

Arc Pass is a pnpm workspace with a React 19/Vite client, Express 5 API, Drizzle/PostgreSQL data layer, OpenAPI-generated Zod and React Query clients, viem chain adapter, and two Solidity credential contracts. The existing implementation has useful pass cards, OAuth helpers, claim routes, tier records, and admin panels that should be retained and hardened rather than replaced wholesale.

The current release blockers are:

- `POST /eligibility/check` infers a new user's Onchain Builder status from a mutable public username and currently defaults that status to eligible.
- OAuth silently creates deterministic demo identities when provider configuration is missing.
- The chain adapter silently returns deterministic activity counts and fake mint/upgrade transaction hashes when providers are missing.
- Wallet addresses can be saved after a normal connection without a signed ownership challenge.
- GitHub is treated as a current Builder prerequisite in the API and claim experience.
- Builder supply is calculated from active, non-revoked credentials and `BuilderPass.sol` restores a slot on revocation.
- Public pass routes expose real credential DTOs without a deliberate public/private serialization boundary.
- Admin access reuses the normal social session and a user-level `isAdmin` flag; dedicated password-hash authentication, lockout, audit records, and separate sessions are absent.
- Typeform application ingestion, replay-safe webhook verification, and application records are absent.
- OpenGraph share-image endpoints are absent; client image export exists, but an X Web Intent cannot attach that image.
- Environment requirements are distributed across modules and partial production configuration can silently degrade to mocks.
- There is no checked-in Drizzle migration history or Solidity test harness.

## Retain

- React/Vite/Tailwind/shadcn/Radix/Framer Motion/wouter/TanStack Query stack.
- Express route composition, opaque HTTP-only browser sessions, OAuth stable provider IDs, PKCE for X, and signed authorization primitives.
- Existing Founder and Builder tables, tier history, snapshots, mint authorization records, pass cards, theme provider, and admin editing surfaces where their security boundary can be corrected.
- `lib/api-spec/openapi.yaml` as the only API contract source, followed by Orval generation.

## Replace or harden

- Replace permissive public eligibility output with minimal Founder and Onchain Builder status objects.
- Replace all implicit mocks with an explicit development-only adapter selected by `ENABLE_DEV_MOCKS=true`; reject that flag in production and fail closed otherwise.
- Replace direct wallet insertion with expiring, single-use nonce challenges and backend signature recovery. Only ownership-verified wallets participate in analysis.
- Remove GitHub from current eligibility and render it only as “Coming soon.” Preserve nullable historical fields.
- Separate mint availability from activity-provider availability and return actionable 503 states.
- Make lifetime issuance immutable: revoked credentials remain counted; upgrades do not consume supply.
- Add a dedicated admin identity/session/audit boundary and Typeform application storage.
- Add public-safe share records and OpenGraph image routes; X sharing uses the public URL.

## Schema migration

- Add `wallet_challenges` with nonce hash, requested address, domain, expiry, consumption, and audit timestamps.
- Add wallet ownership verification timestamp, signature method, and last analysed timestamp; make address globally unique.
- Add `builder_supply` singleton counters for maximum lifetime supply, lifetime issued, active, and revoked counts, with database locking during issuance.
- Add `founder_applications`, `admin_users`, `admin_sessions`, `admin_audit_log`, and processed webhook identifiers.
- Preserve nullable GitHub columns and existing records; do not drop historical data.

## API changes

- Canonical public endpoint: `POST /eligibility/preview` with only nested status values. Keep `/eligibility/check` as a compatibility alias returning the same minimal response during migration.
- Add `/wallets/challenge`, `/wallets/verify`, `/wallets`, wallet delete, and primary-wallet routes.
- Add explicit configuration/availability responses for Builder verification and minting.
- Add Typeform webhook and dedicated admin authentication/session endpoints.
- Add server share pages/images and combined identity sharing.
- Update OpenAPI first, regenerate Zod validators and React Query hooks, then update callers.

## UI direction

The public product uses a warm-white editorial identity with graphite type, precise cool borders, restrained Arc violet/blue, and one signature “sealed credential” scan/deck moment. The authenticated product uses a compact graphite/navy work surface with a top header, strong data hierarchy, and no permanent user sidebar. Mobile layouts recompose into a single task-oriented flow with 44px targets and progressive disclosure; they do not simply scale desktop cards.

Public results use obscured, generic placeholder art only. Real pass cards appear only after authentication or on deliberate public credential pages. Every loading, error, unavailable, cooldown, suspended, and revoked state receives actionable copy and accessible announcements.

## Integration gaps and deployment assumptions

- Real activity verification requires a documented explorer/indexer response contract. Until it is configured, verification returns “Verification is temporarily unavailable.”
- Real minting requires complete RPC, relayer, and both contract addresses. Contracts are not deployed automatically.
- Typeform remains an external link when webhook variables are absent.
- Server-generated OpenGraph images require a production public app URL and an image renderer supported by the deployment target.

## Implementation phases

1. Production safety: environment validation, mock isolation, privacy-safe eligibility, wallet ownership proof, GitHub removal, immutable lifetime supply.
2. Contract and data integrity: migrations, authorization replay checks, contract cap/revocation correction, focused tests.
3. API contract: update OpenAPI and regenerate both generated packages.
4. Product UI: landing, authentication, connected accounts, claim flows, dashboard, pass states, responsive and accessible behavior.
5. Sharing/admin/integrations: OpenGraph public URLs, X intent, Typeform ingestion, dedicated admin authentication and audit trail.
6. Release verification: typecheck, lint, tests, production builds, responsive/a11y/security review, docs and environment examples.

