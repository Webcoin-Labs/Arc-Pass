# Arc Pass — Project Handoff for ChatGPT

This file is the current working handoff for the Arc Pass monorepo. Attach this
file to a new ChatGPT/Codex session before asking it to continue development.
It is intentionally written without secrets, tokens, private keys, or personal
production data.

**Snapshot date:** 2026-07-19

**Repository:** `E:\webcoinlabs\arc-pass`

**Public frontend:** https://arc.webcoinlabs.com

**Local frontend:** http://localhost:5173

**Expected local API:** http://localhost:8080

**Current branch:** `main`

**Release status:** production deployment prepared on July 19, 2026

## 1. Product in one paragraph

Arc Pass by Webcoin Labs is a verified-credential application for Arc founders
and onchain builders. It creates two non-transferable identity credentials:
Founder Pass and Onchain Builder Pass. A Founder Pass is invite-only and
admin-controlled. A Builder Pass is earned through authenticated GitHub data,
ownership-verified wallets, and real Arc activity. Users first claim a
credential into Arc Pass inventory, then may reveal/download/share it, and only
later mint a permanent soulbound credential on Arc when the chain is configured.

## 2. Product rules that must not change

| Area | Current rule |
| --- | --- |
| Founder eligibility | Invite-only; an admin must create the invitation. A username preview can never grant Founder eligibility. |
| Founder variants | Exactly two: **Normal Founder** and **Premium Founder**. |
| Founder tiers | Exactly two active tiers: **Emerging Founder** and **Premier Founder**. Do not reintroduce Formal, Verified, Growth, or Network Founder as selectable tiers. |
| Builder eligibility | Authenticated GitHub account, account age of at least 180 days, at least 10 qualifying contributions in the prior 180 days, at least one ownership-verified wallet, and real qualifying Arc activity. |
| GitHub | GitHub is a linked OAuth account, not the primary login. A typed GitHub username must never grant eligibility. |
| Wallets | A RainbowKit connection is not proof. The backend creates a nonce, the wallet signs it, the backend verifies it, and only then is the wallet ownership-verified. |
| X / Discord | X or Discord can establish identity/login. Discord membership, join date, and roles are supporting signals only and cannot independently grant Builder eligibility. |
| Transferability | Founder and Builder credentials are permanently soulbound/non-transferable. Transfers and approvals revert in Solidity. |
| Builder supply | Solidity has no permanent supply cap. Wave 1 is an off-chain, atomic allocation for the first **2,499 confirmed original Builder mints**. |
| Wave 1 counting | Inventory claims, previews, failed/reverted mints, revocations, Founder mints, and tier upgrades do not consume Wave 1. Only a confirmed original Builder mint consumes one position. |
| Revocation | Revocation does not restore lifetime supply and does not make a credential transferable. |
| Production safety | Missing OAuth, chain, indexer, database, or storage configuration fails closed with an explicit unavailable state. Production must never use fake activity, fake eligibility, fake tiers, fake mint success, or mock OAuth identities. |
| Development fixtures | Development mocks/test identities/admin bootstrap require explicit flags and are rejected when `NODE_ENV=production`. |

## 3. Repository layout

```text
artifacts/arc-pass/      React + Vite frontend
artifacts/api-server/    Express 5 API
lib/db/                  Drizzle schema, SQL migrations, migration runner, seed
lib/api-spec/            OpenAPI source of truth
lib/api-zod/             Generated Zod schemas and validators
lib/api-client-react/    Generated React Query client/hooks
contracts/               FounderPass.sol and BuilderPass.sol
scripts/                 Solidity compiler and utility scripts
public/                  Shared source assets
```

Frontend uses React 19, Vite, Tailwind v4, Radix/shadcn components, Framer
Motion/Motion, wouter, TanStack Query, wagmi, RainbowKit, viem, and
`html-to-image`. Backend uses Express 5, Zod/OpenAPI types, Drizzle, Neon
PostgreSQL, viem, jose, pino, multer, and optional Cloudflare R2/Gemini/provider
integrations.

## 4. Implemented frontend work

### Landing page

- Arc Pass/Webcoin Labs visual identity is preserved with a dark Arc-blue hero,
  animated silhouettes/lines, mascot, Arc gas indicator, and responsive header.
- The main eligibility interaction remains one cohesive group: X/Discord
  selector, username, optional Discord discriminator, Check Eligibility, privacy
  explanation, and Wave 1 context.
- X handles are shown without accidental duplicate `@` characters; input
  normalization strips a leading `@` and compares lower-case handles.
- Discord supports a modern username plus an optional legacy discriminator and
  accepts `username#1234` input.
- Builder Wave 1 supply is shown as `Wave 1 onchain mints: X / 2,499` where it
  affects a decision, not as noisy personal-dashboard analytics.
- Founder is always represented in the eligibility experience. When not
  eligible it is locked/concealed and the founder application path is shown.
- The founder application URL is read from `VITE_FOUNDER_APPLICATION_FORM_URL`;
  no new URL should be invented in future work.
- The Benefits section was reduced to a focused two-column journey with
  Founder/Builder tabs, grouped benefits, an animated right-side visual, and a
  compact mobile selector. It should not become a large static dashboard.
- Partner assets are loaded from existing `public/partners` and `public/logo`
  assets through `partner-cloud.tsx`; do not add fake partner names or generated
  placeholder logos.

### Eligibility scanning

- `src/components/eligibility-scanner.tsx` contains the current scanner.
- While pending, it shows two concealed/overlapping Founder and Builder cards,
  a scan beam, a compact progress bar, five pending scan stages, and a Geo-Sync
  flip-square loader (`.ld-flip`) rather than a generic circular loader.
- The stage copy is privacy-safe and reflects actual checks that can be run:
  identity lookup, Founder invitation lookup, Builder verification preparation,
  Arc verification readiness, and private-preview preparation.
- Detailed verification rows appear only after a real API result/error. They
  support waiting, checking, complete, action required, eligible, not eligible,
  already claimed, provider unavailable, and failed states.
- The landing-page check enforces a minimum three-second presentation window for
  the scan. This delay is UX only; it must not be described as proof that a
  check succeeded. API state remains authoritative.
- `test` development shortcut behavior is allowed only in Vite development and
  requires the backend development-test flag. It must never work in production.

### Pass cards and account UI

- Founder and Builder cards use Arc Pass and Webcoin Labs assets, real avatar
  data where available, company name/logo support, social identity, credential
  metadata, claim/mint status, Arc network, and responsive layouts.
- Builder cards support tier-specific styling and emblems for Bronze, Silver,
  Gold, Platinum, and Diamond, plus contracts deployed, GitHub contributions,
  Discord membership, member-since date, and up to two configured primary role
  indicators.
- Founder cards support Normal/Premium variant and Emerging/Premier tier data.
- Claiming is separate from minting. Inventory claims do not create a token ID
  or consume Wave 1.
- Dashboard/My Passes includes claim state, reveal/mint state, tier progress,
  linked accounts, verified wallets, downloads, sharing, public verification,
  transaction/token information after mint, and logout.
- Mobile pass presentation is intended to show one primary card at a time with
  movement between Founder and Builder; it should not be a squeezed desktop
  layout.

### Sharing, metadata, and reveal

- HTTPS metadata is served from `/api/metadata/{founder|builder}/{id}`.
- Public share pages and Open Graph card images are served from
  `/api/share/...`.
- Before mint, sharing copy says the pass was claimed. After mint, copy says it
  was minted onchain.
- The frontend supports downloading the card image and opening a prefilled X
  post as fallback. Direct X image posting requires a separate OAuth posting
  authorization with the required media/post scopes and must fail gracefully if
  unavailable.
- Claim/reveal/mint are separate states. Reveal should run once after claim and
  later visits should show the full card immediately.

## 5. Implemented backend/API work

### Process and health

- Express app is in `artifacts/api-server/src/app.ts`.
- `/api/healthz` is intentionally lightweight and does not depend on Neon or an
  optional provider. It returns `{ "status": "ok" }` when the process is alive.
- `/api/readyz` performs a database `select 1` and returns a 503 database
  unavailable state when Neon cannot be reached.
- Startup validates the environment, starts the HTTP server, handles server
  errors, and performs graceful SIGINT/SIGTERM shutdown with database-pool
  cleanup.
- Neon pool defaults are conservative (`DB_POOL_MAX` default 5, max 20), with
  idle timeout, connection timeout, max uses, and an idle-client error handler.
- Optional providers should return explicit unavailable errors rather than
  crashing the process.

### Routes currently present

```text
GET  /api/healthz
GET  /api/readyz

GET  /api/auth/x
GET  /api/auth/x/callback
GET  /api/auth/discord
GET  /api/auth/discord/callback
GET  /api/auth/github
GET  /api/auth/github/callback
GET  /api/auth/me
POST /api/auth/logout
GET  /api/auth/dev-test/:provider       development only

POST /api/eligibility/preview
POST /api/eligibility/check

GET  /api/users/me
GET  /api/wallets
POST /api/wallets/challenge
POST /api/wallets/verify
PATCH /api/wallets/:walletId/primary
DELETE /api/wallets/:walletId

GET  /api/passes/me
GET  /api/dashboard/stats
POST /api/passes/founder/claim
POST /api/passes/founder/mint
POST /api/passes/builder/verify
POST /api/passes/builder/reverify
POST /api/passes/builder/upgrade
POST /api/passes/builder/claim
POST /api/passes/builder/mint
GET  /api/passes/builder/supply
GET  /api/passes/{founder|builder}/:id
GET  /api/passes/{founder|builder}/:id/download-url

POST /api/share/x/direct
GET  /api/metadata/:type/:id
GET  /api/share/:type/:id
GET  /api/share/:type/:id/image
GET  /api/network/gas-price

POST /api/admin/auth/login
GET  /api/admin/auth/session
POST /api/admin/auth/logout
GET/POST/PATCH /api/admin/founder-passes...
GET/PATCH/POST /api/admin/builder-passes...
GET/POST/PATCH /api/admin/founder-tiers...
GET/PATCH /api/admin/builder-tiers...
POST /api/admin/uploads/image
GET /api/admin/mint-records
GET /api/admin/overview

POST /api/webhooks/typeform/founder-application
```

### Authentication and OAuth

- X OAuth uses server-side state and provider identity lookup.
- Discord OAuth requests identity and, when configured/supported, the user’s
  guild membership record. It can store membership, `joined_at`, role IDs, and
  primary-role status.
- GitHub OAuth uses a server-side PKCE verifier and is a linked account flow.
- OAuth state is signed, short-lived, single-use, and stored server-side where
  required. Callback errors should redirect to a safe frontend error state and
  never expose provider tokens.
- Sessions use HttpOnly cookies. The database stores only a digest of the
  session token; logout deletes the session.
- No wallet signature is requested during ordinary X/Discord login. A signature
  is requested only for intentional wallet linking/ownership verification or an
  onchain action.

### Identity normalization

- X usernames are normalized to lower case and stripped of a leading `@`.
- Discord accepts modern usernames and optional `#1234` legacy discriminators.
- OAuth identities remain the source of truth. A manually entered Discord name
  is not membership proof and a manually entered GitHub name cannot grant
  Builder eligibility.

### Builder verification and tiers

- Real chain/indexer activity is required. Missing `EXPLORER_API_URL` or
  `EXPLORER_API_KEY` produces `VerificationUnavailableError`.
- Tier thresholds are encoded as: Bronze 2, Silver 10, Gold 50, Platinum 100,
  Diamond 1,000 qualifying Arc transactions.
- Tier upgrades are upward-only and preserve the existing credential number.
- Discord is supporting evidence. With only `ARC_DISCORD_GUILD_ID`, membership
  and join date may be available; role names require a bot or a role-catalog
  integration. Unknown/unavailable must not be rendered as false.

### Chain adapter and gas

- `chain-adapter.ts` has `onchain`, `development_mock`, and `unavailable` modes.
- In production, missing chain/indexer configuration selects unavailable mode;
  it does not fabricate counts or transaction hashes.
- Development mock mode is selected only by `ENABLE_DEV_MOCKS=true` and is
  rejected in production.
- The gas endpoint uses Blockscout-style stats through the configured explorer
  endpoint, caches for 30 seconds, de-duplicates in-flight requests, times out,
  and returns unavailable without blocking the page.

## 6. Smart contracts

Files:

- `contracts/FounderPass.sol`
- `contracts/BuilderPass.sol`

Implemented contract properties:

- ERC-721-compatible read surface: `ownerOf`, `balanceOf`, `tokenURI`, events,
  and `supportsInterface`.
- `transferFrom`, `safeTransferFrom`, `approve`, and `setApprovalForAll` revert.
- Mint/upgrade signatures bind chain ID, recipient, identity hash, tier/variant,
  contract address, and exact metadata URI.
- EIP-191 signature recovery normalizes `v` and rejects high-`s` malleability.
- Signature replay protection uses consumed signature hashes.
- One credential per identity is enforced by identity-to-token mapping.
- Admin and authorized-signer rotation use two-step acceptance.
- Builder tier upgrades cannot downgrade.
- Builder `totalSupply` tracks lifetime original issuance; revocation only lowers
  active supply and does not restore original supply.

Important status: the Solidity sources compile, but the contracts are not
independently audited and the handoff must not claim live minting until both
contracts are deployed on the intended Arc network, configured in Railway, and
tested with real transactions and receipts.

Metadata does not require IPFS for wallet display: HTTPS metadata URLs are
compatible with the contracts. IPFS/Arweave is optional for independent,
long-term pinning and should be added only with a real storage/pinning plan.

## 7. Database and migrations

Schema areas include users, OAuth identities/states, sessions, wallets and
wallet challenges, Founder passes/invitations/tiers/applications, Builder
passes/tiers/history/verification snapshots, supply/reservations, mint
authorizations, Discord signals, and X share drafts.

Tracked migrations currently include:

```text
0001_production_credentials.sql
0002_builder_release_phases.sql
0003_builder_identity_signals.sql
0004_founder_tier_catalog.sql
0005_discord_primary_roles.sql
0006_founder_two_tier_catalog.sql
0007_builder_wave_mint_reservations.sql
0008_discord_discriminators.sql
0009_x_share_drafts.sql
0010_oauth_pkce_server_storage.sql
0011_inventory_credential_numbers_and_wave_naming.sql
0012_fixed_builder_tier_thresholds.sql
```

`lib/db/src/migrate.ts` is the forward-only migration runner used by Railway.
It records applied migrations in `arc_pass_migrations`, runs each migration in
a transaction, and adopts legacy schemas without replaying old migrations.
Production must not run unrestricted `drizzle-kit push` or automatic seed data.
The seed script is for deliberate development/setup use only.

## 8. Environment variables

Use `.env.example` for local setup and `.env.production.example` as the
deployment checklist. Never copy real values into this handoff.

### Required production core

```text
NODE_ENV=production
DATABASE_URL
SESSION_SECRET                  # 32+ characters
APP_URL=https://arc.webcoinlabs.com
FRONTEND_URL=https://arc.webcoinlabs.com
OAUTH_STATE_SIGNING_KEY         # base64, decodes to 32+ bytes
MINT_SIGNING_KEY                # base64, decodes to 32+ bytes
PORT                            # Railway supplies this
```

### OAuth callbacks

Register these exact production callbacks in each provider:

```text
https://arc.webcoinlabs.com/api/auth/x/callback
https://arc.webcoinlabs.com/api/auth/discord/callback
https://arc.webcoinlabs.com/api/auth/github/callback
```

Variables: `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`,
`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`,
`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`.

### Discord

- `ARC_DISCORD_GUILD_ID` enables the Arc guild supporting signal.
- `ARC_DISCORD_PRIMARY_ROLE_IDS` can contain up to two role IDs.
- `DISCORD_BOT_TOKEN` is optional and server-only; it is needed to map role IDs
  to friendly names. Without a bot, configure only the guild ID and show role
  names as unavailable/unchecked.

### Chain/indexer

Configure all of these before enabling production minting/activity verification:

```text
CHAIN_RPC_URL
ARC_CHAIN_ID
RELAYER_PRIVATE_KEY
FOUNDER_PASS_CONTRACT_ADDRESS
BUILDER_PASS_CONTRACT_ADDRESS
EXPLORER_API_URL
EXPLORER_API_KEY
```

The relayer key must be protected and funded. Contract addresses must be the
deployed, audited contracts on the intended Arc network.

### Storage and applications

Production R2 requires all five values:

```text
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET
CLOUDFLARE_R2_PUBLIC_URL
```

Founder application/webhook values: `VITE_FOUNDER_APPLICATION_FORM_URL`,
`TYPEFORM_FORM_ID`, `TYPEFORM_API_TOKEN`, `TYPEFORM_WEBHOOK_SECRET`.

### Wave 1 and development-only controls

```text
BUILDER_PHASE_NAME=Wave 1
BUILDER_PHASE_CLAIM_LIMIT=2499
ENABLE_DEV_MOCKS=false
ENABLE_DEV_TEST_IDENTITIES=false
ENABLE_DEV_ADMIN_BOOTSTRAP=false
DEV_ELIGIBLE_X_HANDLES=
DEV_ELIGIBLE_DISCORD_HANDLES=
DEV_ADMIN_BOOTSTRAP_EMAIL=
```

The three enable flags and development handle lists must be empty/false in
production. `ENABLE_DEV_MOCKS=true` is explicitly forbidden in production.

## 9. Deployment

### Vercel frontend

`vercel.json` builds `artifacts/arc-pass`, publishes
`artifacts/arc-pass/dist/public`, rewrites `/api/*` and `/uploads/*` to the
Railway API, and sends all other paths to the SPA entrypoint. The Vercel domain
must be configured as `https://arc.webcoinlabs.com` and the Railway API URL in
`vercel.json` must point to the live API service.

### Railway backend

`railway.json` currently uses:

```text
build:       pnpm --filter @workspace/api-server build
pre-deploy:  pnpm --filter @workspace/db migrate
start:       pnpm --filter @workspace/api-server start
healthcheck: /api/healthz
```

Railway should contain the production environment variables above and a Neon
`DATABASE_URL`. The pre-deploy command is the tracked forward-only migration
runner; do not replace it with unrestricted `push` or `seed`.

## 10. What is verified locally

Previously verified during this workstream:

- Workspace/frontend typecheck passed.
- API typecheck/build passed.
- Frontend Vite build passed.
- API unit/security tests passed in the last recorded run.
- Solidity compilation passed with the repository compiler script.
- `/api/healthz` returned HTTP 200.
- Frontend smoke routes loaded: `/`, `/claim/founder`, `/claim/builder`,
  `/dashboard`, and `/admin`.
- Privacy-safe unknown eligibility returns unknown Founder status and Builder
  verification-required status.
- Scanner UI was checked at desktop and narrow mobile widths; the compact
  two-card scanner and flip loader rendered without horizontal overflow.

Run these commands after any further edits:

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/arc-pass typecheck
pnpm --filter @workspace/arc-pass build
pnpm run contracts:compile
```

## 11. Tests that exist

API test files currently include:

```text
blockscout-gas.test.ts
contract-scarcity.test.ts
discord-oauth.test.ts
founder-tier-catalog.test.ts
github-oauth.test.ts
identity-session.test.ts
production-safety.test.ts
security-flow.test.ts
wave-allocation.integration.test.ts
x-oauth.test.ts
```

They cover environment/mock policy, OAuth/provider behavior, identity/session
security, tier catalog rules, gas parsing, wallet/security flow, and Wave 1
allocation invariants. Future work should add or confirm explicit tests for all
requested boundaries: 0/1/2/9/10/49/50/99/100/999/1000 transactions, GitHub
age exactly below/at 180 days, 9/10 contributions, contribution-window
filtering, inventory claim versus mint, failed/replayed/concurrent final-slot
mints, OAuth state replay, wallet nonce replay, and X share fallback.

## 12. Known incomplete or externally blocked work

Do not tell a user that the following are live until tested against real
providers/contracts:

1. Live X OAuth approval and callback on `arc.webcoinlabs.com`.
2. Live Discord OAuth, Arc guild membership, join date, and role response.
3. Live GitHub OAuth PKCE linking and authenticated contribution data.
4. Browser wallet nonce signing and ownership verification with a real wallet.
5. Deployment of audited FounderPass and BuilderPass contracts to Arc.
6. Real relayed mint, upgrade, revoke, and receipt/token-ID flows.
7. Production Cloudflare R2 upload/download and public OG image fetches.
8. Direct X media posting approval and media attachment flow.
9. Neon production migration run and Railway restart/health behavior under real
   provider outages.
10. Distributed/public-scale rate limiting. The public eligibility limiter is
    currently in-process and should move to Redis or an equivalent shared store
    before high-traffic production use.

Potential follow-up hardening:

- Independently audit the Solidity contracts before deployment.
- Verify every mint path uses the database `mintAuthorizations`/signed-claims
  defense-in-depth record consistently.
- Run a production dependency audit and upgrade RainbowKit/wagmi/connectors if
  compatible patched versions resolve current transitive advisories.
- Add end-to-end tests against a staging OAuth app, staging Neon database,
  staging R2 bucket, and a test Arc deployment.
- Check historical migrations for old “Phase 1” strings; persisted operational
  data is migrated to Wave 1, but old migration filenames/comments are retained
  for migration history and must not be edited destructively.

## 13. Discord without server-admin access

The simplest supported no-bot setup is to configure only
`ARC_DISCORD_GUILD_ID`. The user’s OAuth membership record and join date may be
available through Discord’s user-membership scope, but role names cannot be
resolved reliably without a bot or role-catalog access. Do not treat a typed
Discord username, screenshot, or manually supplied role as proof. Ask a server
owner to install the bot only if role names/role membership must be displayed.

## 14. Instructions for the next ChatGPT session

1. Inspect the repository and current `git status` before editing. Preserve
   unrelated dirty changes; do not reset or commit unless explicitly asked.
2. Read this file, `ARC_PASS_OVERVIEW.md`, `README.md`, the relevant route/page,
   and the relevant tests before changing behavior.
3. Preserve all product rules in Section 2, especially no production mocks,
   wallet ownership signatures, Founder invite-only eligibility, GitHub OAuth,
   non-transferability, and the 2,499 Wave 1 mint boundary.
4. For UI tasks, use existing Arc/Webcoin assets under `public/logo` and
   `public/partners`. Keep the current Arc identity and make mobile intentional.
5. For backend tasks, fail closed when an optional integration is missing and
   keep `/api/healthz` lightweight.
6. Run typecheck, tests, frontend/backend builds, and Solidity compilation after
   changes. Report what was actually run and what still needs real credentials.
7. Never print secrets, tokens, private keys, OAuth codes, or private user data.

### Copy/paste continuation prompt

> You are taking over the Arc Pass monorepo. Read `PROJECT_HANDOFF.md` first,
> inspect the actual repository and dirty worktree, and verify the current
> implementation before editing. Preserve all security/product rules in the
> handoff. Identify the highest-risk remaining issue, make the smallest
> testable change, run the relevant checks, and report exact files changed,
> tests run, and any external provider configuration still required. Do not
> claim live OAuth, Discord, GitHub, wallet, R2, indexer, or onchain minting
> works unless it was tested against a real configured provider.
