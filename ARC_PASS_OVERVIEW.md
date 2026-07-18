# Arc Pass — Project Overview

Arc Pass is a Webcoin Labs verified-credential platform for Arc founders and
builders. It issues two non-transferable identity credentials and records the
final credential onchain after identity, wallet ownership, and eligibility
checks pass.

## Credential rules

| | Founder Pass | Builder Pass |
|---|---|---|
| Eligibility | Admin invite-only by verified X or Discord identity | Real onchain activity plus linked GitHub account and verified wallets |
| Supply | Uncapped, admin-controlled | No permanent Solidity cap; Wave 1 permits 2,499 confirmed original onchain mints |
| Permanence | Non-transferable; variant and tier lock after mint | Non-transferable; tier upgrades update the same credential |
| Variants / tiers | Normal or Premium variant; Emerging Founder or Premier Founder tier | Bronze, Silver, Gold, Platinum, or Diamond |

Founder eligibility is never inferred from activity. A username preview can
only say that verification is available; it cannot claim a pass. Builder
eligibility is unavailable when the indexer is unavailable and never falls back
to fake production counts.

Builder Discord data is supporting evidence, not a standalone eligibility
grant. When configured, the API stores the Arc server join date and up to two
primary role results (`hasRole: true`, `false`, or `null` when unknown).

## Stack and data model

- Frontend: React, Vite, Tailwind, Framer Motion, wouter, RainbowKit/wagmi.
- API: Express, Zod, viem, OAuth providers, and signed short-lived state.
- Database: Neon PostgreSQL with Drizzle ORM.
- Contracts: `contracts/FounderPass.sol` and `contracts/BuilderPass.sol`.
- Core tables: users, sessions, wallets, founder passes/tiers, builder
  passes/tiers, verification snapshots, tier history, and mint authorizations.

Sessions use an HttpOnly cookie while only an HMAC digest of the token is
stored. Wallet association requires a server nonce and a wallet signature.
Founder and Builder contracts reject transfers and approvals, bind signed mint
authorizations to chain/contract/recipient/identity, and reject replay.

## Integration state

- Neon database: real.
- X, Discord, and GitHub OAuth: real implementations; GitHub is link-only.
- Discord membership and join-date lookup: available with the configured guild
  ID and the user's OAuth authorization. Role names require optional bot access;
  without it, the API leaves role-name results unknown rather than guessing.
- Activity/indexer data: real provider required in production; explicit
  `ENABLE_DEV_MOCKS=true` is the only development fallback.
- Minting: real viem path once chain variables and deployed addresses exist;
  missing production configuration fails closed.
- Metadata: API HTTPS metadata works without IPFS. IPFS is optional when
  immutable pinning is desired.

## Production checklist and remaining risks

1. Deploy and independently review both Solidity contracts.
2. Set `ARC_CHAIN_ID`, RPC, relayer, contract addresses, and a real indexer.
3. Set persistent session/OAuth/mint signing keys and all Cloudflare R2 values.
4. Railway runs the tracked `pnpm --filter @workspace/db migrate` command.
   Review each new SQL migration before deploying it to Neon.
5. Complete live OAuth, wallet-signature, mint, metadata, and revoke tests on
   the production domain.

`pnpm audit --prod` currently reports transitive `ws`/`uuid` advisories in the
wallet connector tree; update RainbowKit/Wagmi when a compatible patched
connector release is available.

## Verification and Wave 1 semantics

Builder eligibility requires all of the following: GitHub OAuth ownership, a
GitHub account at least 180 days old, at least 10 contributions during the
previous 180 days, at least one ownership-verified wallet, and real qualifying
Arc activity. Discord is supporting context only. Transaction tier boundaries
are Bronze 2+, Silver 10+, Gold 50+, Platinum 100+, and Diamond 1,000+.

An inventory claim does not consume Wave 1. A mint slot is reserved under a
PostgreSQL advisory lock immediately before the original Builder mint, then
finalized only after the chain adapter returns a confirmed transaction result.
Failed reservations are cleared and stale reservations expire. Tier upgrades,
revocations, downloads, and shares do not consume or restore mint supply.
