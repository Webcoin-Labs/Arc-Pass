# Arc Pass - ChatGPT Handoff

This document is a complete project handoff for another engineer or ChatGPT
session. It describes what is implemented, what was verified, how production is
configured, and what still needs real credentials or deployment work.

**Project:** Arc Pass by Webcoin Labs

**Repository:** `https://github.com/Webcoin-Labs/Arc-Pass`

**Working branch:** `main`

**Release status:** production deployment prepared on July 19, 2026

**Local frontend:** `http://localhost:5173`

**Local API:** `http://localhost:8080`

**Production frontend:** `https://arc.webcoinlabs.com`

**Date of this handoff:** 2026-07-19

## 1. Product definition

Arc Pass is a Webcoin Labs verified-credential platform for Arc founders and
onchain builders. It issues two identity credentials:

| Credential | Eligibility | Supply | Transferability |
| --- | --- | --- | --- |
| Founder Pass | Admin invitation tied to a verified X or Discord identity | Uncapped, admin-controlled | Permanently non-transferable |
| Onchain Builder Pass | GitHub OAuth, 180-day account age, 10 contributions in the prior 180 days, ownership-verified wallets, and real Arc activity | No permanent Solidity cap; Wave 1 permits 2,499 confirmed original onchain mints | Permanently non-transferable |

The credentials are proof of identity and contribution, not tradable NFTs.

### Founder rules

- Founder eligibility is invite-only.
- A public username preview never grants eligibility and never reveals private
  pass data.
- There are exactly two Founder variants: **Normal Founder** and
  **Premium Founder**.
- The active Founder tier catalog is fixed to exactly **Emerging Founder** and **Premier Founder**.
- The chosen variant and tier are locked when the Founder credential is minted.
- Founder invitations can include a required company name and an optional
  company logo.
- Founder revocation does not make the credential transferable or silently
  reissue it.

### Builder rules

- Builder verification is based on real indexer data. Missing indexer or chain
  configuration returns an unavailable/verification-required state; it never
  creates fake counts, tiers, eligibility, or mint success.
- GitHub must be linked and verified before a Builder claim can proceed.
- Wallet ownership must be proven with a server nonce and wallet signature.
- Discord membership is supporting evidence, not a standalone eligibility grant.
- Builder tiers are Bronze, Silver, Gold, Platinum, and Diamond.
- Builder upgrades move upward in place; the identity and credential number do
  not change.
- The Solidity contract has no permanent supply cap. Wave 1 is enforced by an
  atomic backend allocation of 2,499 confirmed original onchain mints.
- Revoke reduces active supply but never rewinds original lifetime issuance.

## 2. What has been implemented

### Frontend

- React 19 + Vite application with Tailwind/shadcn styling, Framer Motion,
  wouter routing, TanStack Query, wagmi, and RainbowKit.
- Spaceship-inspired Arc Pass landing page with animated background, mascot,
  responsive navigation, mobile layout, scanner/loading sequence, eligibility
  preview, and gwei display.
- Public eligibility experience distinguishes:
  - Founder invitation found, claimed, under review, or no invitation.
  - Builder verification required after login, rather than claiming eligibility
    from a username.
- Founder and Builder credential cards have branded visual treatments, Arc and
  Webcoin Labs branding, user avatar fallback, company logo support, status,
  tier/variant badges, credential metadata, social handles, and responsive
  layouts.
- Builder card supports tier-specific colors and emblems, contracts deployed,
  GitHub contributions, Discord membership, member-since date, and up to two
  configured primary role indicators.
- Claim flow separates `Claim` (adds the credential to the user inventory) from
  `Mint onchain` (writes the credential to the deployed contract).
- Mint success state supports a public share URL and Open Graph image. Basic X
  direct image posting now uses a one-shot X OAuth flow with explicit tweet.write and media.write permissions; the fallback
  require separate X posting authorization/API integration.
- Admin portal includes overview, Founder passes, Builder passes, tier
  configuration, mint records, settings, image upload, suspend/unsuspend, and
  revoke actions.
- Added Arc Pass/Webcoin Labs assets and Discord icon assets under `public/`.

### Authentication and identity

- X OAuth implementation uses the current X host and identity scopes.
- Discord OAuth requests `identify guilds.members.read` and records Arc guild
  membership, `joined_at` when supplied, role IDs, and configured primary role
  status.
- GitHub OAuth is a link flow and uses PKCE. GitHub contribution data is fetched
  through the authenticated account rather than an unverified username.
- OAuth state is signed and short-lived.
- Sessions use an HttpOnly cookie. Only an HMAC digest of a session token is
  stored in the database; legacy raw rows are lazily migrated.
- Logout deletes the session.
- Wallet linking uses a server-generated nonce, a wallet signature, backend
  verification, and an ownership-verified wallet record. Merely connecting a
  RainbowKit wallet does not prove ownership.
- Production rejects development mocks, test identities, and development admin
  bootstrap flags.

### Backend/API

- Express 5 API with Zod/OpenAPI-generated client types.
- Neon PostgreSQL with Drizzle ORM.
- Production security headers include frame protection, HSTS, and a CSRF
  origin/referer guard for state-changing requests.
- Public eligibility preview is deliberately privacy-safe and rate-limited in
  process memory.
- API routes include:

  - `GET /api/healthz`
  - `POST /api/eligibility/preview`
  - `POST /api/eligibility/check`
  - OAuth routes for X, Discord, and GitHub
  - `GET /api/auth/me`, `POST /api/auth/logout`
  - `GET/POST /api/wallets/challenge`, `POST /api/wallets/verify`
  - Founder and Builder claim, verify, reverify, upgrade, and mint routes
  - `GET /api/passes/builder/supply`
  - Public metadata and share routes under `/api/metadata` and `/api/share`
  - Admin authentication and admin pass/tier/upload/mint-record routes
  - Typeform founder-application webhook
  - `GET /api/network/gas-price`

### Smart contracts

Files:

- `contracts/FounderPass.sol`
- `contracts/BuilderPass.sol`

Implemented contract protections:

- ERC-721-compatible identity surface (`ownerOf`, `balanceOf`, `tokenURI`,
  `Transfer`, `supportsInterface`) so wallets can recognize credentials.
- Transfers, approvals, and operator approvals revert because the credentials
  are soulbound.
- Mint and upgrade authorizations bind the chain ID, contract, recipient,
  identity, tier/variant, and metadata URI.
- EIP-191 signatures reject malleable `s` values and normalize `v`.
- Onchain replay protection uses consumed signature hashes.
- One credential per identity is enforced by an identity-to-token mapping.
- Admin and authorized-signer rotation uses two-step acceptance.
- Builder tier upgrades cannot downgrade.
- Builder `totalSupply` records lifetime original issuance and does not decrease
  when a credential is revoked.

The contracts are source-reviewed but not independently audited or deployed.
The backend adapter is ready to use the real contracts once the chain
environment variables and deployed addresses are supplied.

### Metadata and images

- The API serves HTTPS ERC-721 metadata at `/api/metadata/{founder|builder}/{id}`.
- Share pages and Open Graph images are served by `/api/share/...`.
- Local development stores uploads on disk.
- Production requires all five Cloudflare R2 variables and fails closed on
  partial configuration.
- IPFS is optional. HTTPS metadata is sufficient for wallet display; IPFS is
  useful when long-term independent pinning is required.

## 3. Database and migrations

Important data groups include:

- users and linked OAuth identities
- hashed sessions
- wallets and wallet ownership challenges
- Founder passes and Founder tier catalog
- Builder passes, tier history, and verification snapshots
- mint authorization records
- Discord membership, joined date, role IDs, and primary role status

Migrations currently added/updated include:

- `lib/db/migrations/0003_builder_identity_signals.sql`
- `lib/db/migrations/0004_founder_tier_catalog.sql`
- `lib/db/migrations/0005_discord_primary_roles.sql`

The configured Neon database was updated successfully during development.

## 4. Environment variables

Use `.env.example` for local development and `.env.production.example` for
deployment. Never commit `.env`, `.env.local`, or production secret files.

### Required core values

- `DATABASE_URL`
- `SESSION_SECRET` (at least 32 characters in production)
- `APP_URL`, `FRONTEND_URL`, `PORT`, `NODE_ENV`
- `MINT_SIGNING_KEY` and `OAUTH_STATE_SIGNING_KEY` (persistent base64 keys in
  production)

### OAuth values

- `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI`
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`

Production callback URLs use the public domain, for example:

```text
https://arc.webcoinlabs.com/api/auth/x/callback
https://arc.webcoinlabs.com/api/auth/discord/callback
https://arc.webcoinlabs.com/api/auth/github/callback
```

### Discord values

- `ARC_DISCORD_GUILD_ID`: the Arc server ID.
- `ARC_DISCORD_PRIMARY_ROLE_IDS`: up to two role IDs to display on Builder
  cards.
- `DISCORD_BOT_TOKEN`: server-only bot token used to resolve role IDs to names.

The API never sends the bot token to the frontend.

### Onchain values

All of these must be configured together before production minting is enabled:

- `CHAIN_RPC_URL`
- `ARC_CHAIN_ID`
- `RELAYER_PRIVATE_KEY`
- `FOUNDER_PASS_CONTRACT_ADDRESS`
- `BUILDER_PASS_CONTRACT_ADDRESS`
- `EXPLORER_API_URL` and `EXPLORER_API_KEY` for real activity/indexer data

If chain/indexer configuration is missing in production, the API fails closed;
it does not use deterministic transaction or contract-count mocks.

### Storage values

Production requires all five Cloudflare R2 variables:

- `CLOUDFLARE_R2_ENDPOINT`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_URL`

### Development-only values

Development test identities, mock indexer data, and admin bootstrap are guarded
by explicit flags and are rejected when `NODE_ENV=production`:

- `ENABLE_DEV_MOCKS`
- `ENABLE_DEV_TEST_IDENTITIES`
- `DEV_ELIGIBLE_X_HANDLES`
- `DEV_ELIGIBLE_DISCORD_HANDLES`
- `ENABLE_DEV_ADMIN_BOOTSTRAP`

## 5. Deployment layout

### Vercel frontend

`vercel.json` builds `artifacts/arc-pass` and publishes
`artifacts/arc-pass/dist/public`. It rewrites:

- `/api/*` to the Railway API service
- `/uploads/*` to the Railway API service
- all other routes to the Vite SPA entrypoint

### Railway API

`railway.json` builds and starts `@workspace/api-server` and health-checks
`/api/healthz`.

Important production warning: the current Railway configuration still runs
`pnpm --filter @workspace/db push && pnpm --filter @workspace/db seed` as a
pre-deploy command. Replace this with a reviewed, forward-only migration
runner before treating the deployment as production-safe.

### Local commands

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/db run seed
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/arc-pass run dev
```

## 6. Verification evidence

The following checks were run before commit `8dcba1e`:

- `pnpm -w run typecheck` - passed.
- `pnpm --filter @workspace/api-server test` - 20 passed, 0 failed.
- `pnpm --filter @workspace/api-server build` - passed.
- `pnpm --filter @workspace/arc-pass build` - passed. Vite reports non-blocking
  sourcemap, dependency annotation, and large-chunk warnings.
- Solidity compilation with `solc@0.8.24` - passed.
- `GET http://localhost:8080/api/healthz` - HTTP 200 with `{"status":"ok"}`.
- Frontend route smoke tests for `/`, `/claim/founder`, `/claim/builder`,
  `/dashboard`, and `/admin` - all HTTP 200.
- Privacy-safe eligibility preview for an unknown identifier returned
  `founder.status = unknown` and `builder.status = verification_required`.
- The configured Neon schema push completed successfully.

The following are **not** fully end-to-end tested locally because they require
external infrastructure or user interaction:

- live X, Discord, and GitHub OAuth approval/callbacks
- real wallet nonce signing from a browser wallet
- real Discord guild membership/role response from the Arc server
- a deployed FounderPass or BuilderPass contract
- real relayed mint, upgrade, and revoke transactions
- production R2 uploads and production-domain Open Graph fetches

## 7. Known risks and next actions

1. Independently audit and deploy both Solidity contracts.
2. Configure and test production OAuth callback URLs on the exact public domain.
3. Configure the Arc chain ID, RPC, relayer, contract addresses, and real
   Blockscout/indexer values.
4. Replace Railway's unrestricted Drizzle `push` pre-deploy command with a
   reviewed migration process.
5. Configure persistent production signing/session keys and Cloudflare R2.
6. Run live wallet, claim, mint, upgrade, revoke, metadata, and share tests.
7. Address the current production dependency audit: `pnpm audit --prod`
   reports one high and three moderate transitive advisories, including a
   vulnerable `ws` range in the wallet connector dependency tree and a `uuid`
   advisory. Upgrade RainbowKit/Wagmi/connectors when compatible patched
   releases are available, then rerun the audit.
8. Replace the in-memory eligibility rate limiter with a distributed limiter
   such as Redis before public scale.
9. Wire the backend `signed-claims` authorization table into every mint path as
   an additional defense-in-depth layer; onchain replay protection is already
   active.

## 8. Discord access: what to do if you are not a server admin

You do not need to be an Arc server administrator to create the Discord OAuth
application, but you cannot install a bot into the Arc server without a server
owner or member with the required server-management permission.

### Option A - recommended: ask the server owner to install the bot

Ask the Arc server owner to:

1. Add the Discord bot/application to the Arc server.
2. Allow the bot to read the guild role catalog.
3. Send you the Arc guild ID and the two role IDs that should appear on Builder
   cards.
4. Keep the bot token private. The token should be entered only into the
   Railway API environment; the owner does not need to give the token to users.

The application then uses each user's Discord OAuth approval to check that
user's own Arc membership and `joined_at` value. The bot is only needed to map
role IDs to human-readable role names. It does not grant Builder eligibility by
itself.

Suggested message to the server owner:

> We are adding Arc Pass verification. Could you install the Arc Pass Discord
> bot in the Arc server and provide the server ID plus the IDs of the two roles
> we should display? The bot token will remain server-side in Railway and will
> never be shared with users. We only need membership/join-date verification and
> role-name lookup; we do not need moderation permissions.

### Option B - no bot: membership and join date only

The current Discord OAuth flow requests `identify guilds.members.read`, so a
user can authorize the application to read their own membership record. With
only `ARC_DISCORD_GUILD_ID` configured, the app can show membership and the
join date when Discord returns it. It cannot reliably resolve role names
without the bot role catalog.

In this mode, do not configure `ARC_DISCORD_PRIMARY_ROLE_IDS` until the bot is
available. The Builder card should show role status as unavailable/unchecked,
not as false.

### Option C - manual role verification

If the owner will not install a bot, use a documented admin review process or a
signed server export supplied by the owner. This is not currently an automatic
Arc Pass route; it would need a new admin-only import/review feature. Do not
accept a screenshot or a username as cryptographic proof of membership.

### Discord limitations to remember

- A Discord username alone does not prove membership.
- OAuth membership is a supporting signal and does not replace wallet ownership
  or onchain activity checks.
- Role names require a readable role catalog; role IDs alone are not enough for
  a friendly card label.
- If Discord returns an error or missing scope, the API stores an unknown state,
  not a false membership claim.

## 9. Prompt to give another ChatGPT session

Attach this file and send the following:

> You are taking over the Arc Pass monorepo described in `CHATGPT_HANDOFF.md`.
> First inspect the repository and verify the current branch/commit. Preserve
> the product decisions in this handoff: soulbound Founder and Builder
> credentials, no production mocks, wallet ownership signatures, GitHub link
> requirement, Founder invite-only eligibility, Builder Wave 1 allocation of
> 2,499 with no permanent Solidity cap, and Discord membership as a supporting
> signal. Do not expose or print secrets. Identify the highest-risk remaining
> production gaps, then propose a small, testable next step before editing.

When continuing work, always run typecheck/tests/builds after changes and do not
claim that live OAuth, wallet, Discord, or mint flows work until they have been
tested against real configured providers and deployed contracts.
