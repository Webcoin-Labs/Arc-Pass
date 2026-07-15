# Arc Pass — Project Overview

A verified-credential platform for Arc network founders and builders. This document summarizes what Arc Pass is, how it's built, what's real vs. mocked, and what's left — written to hand to someone (or another AI) with zero prior context on the project.

## 1. What Arc Pass is

Arc Pass is **not** an NFT minting platform. It's positioned as:

- a verified credential
- a founder and builder proof layer
- a professional network identity
- an onchain reputation asset
- a portable record of verified ecosystem contribution

It issues two non-transferable identity credentials:

| | Founder Pass | Builder Pass |
|---|---|---|
| Eligibility | Admin invite-only (X or Discord handle) | Onchain activity + GitHub contribution |
| Supply | Uncapped, admin-controlled | Capped at 1,500 unique holders |
| Permanence | Permanent once minted (variant + tier locked forever) | Can upgrade tier; identity/pass number stay fixed |
| Variants/Tiers | Normal / Premium Black (variant) + configurable Founder tiers | Bronze → Silver → Gold → Platinum → Diamond |

Brand: **Arc Pass**, domain `arc.webcoinlabs.com`, "Powered by Webcoin Labs". Product language favors "verified credential," "proof of contribution," "network identity" over generic crypto-marketing terms (no "revolutionary," "exclusive NFT," etc.).

## 2. Credential rules (the part most worth getting right)

**Founder Pass**
- Eligibility is admin-controlled only — never derived from activity. Admin creates an invite by X/Discord handle (works pre- or post-signup; auto-links to the account on first login).
- Variant (Normal / Premium Black) is chosen by admin before mint and is permanent — cannot change after issuance, even by admin (short of a manual DB correction).
- Founder tier (separate from variant) is a configurable label (seeded placeholders: Emerging/Verified/Growth/Premier/Network Founder) — admin can rename/add tiers freely.

**Builder Pass**
- Must have ≥1 valid deployed contract to qualify for *any* tier — transaction volume alone never qualifies.
- Tier thresholds (OR logic — either satisfies):

  | Tier | Qualifying transactions | Valid contracts |
  |---|---|---|
  | Bronze | 10+ | 2+ |
  | Silver | 50+ | 10+ |
  | Gold | 100+ | 50+ |
  | Platinum | 500+ | 100+ |
  | Diamond | 1,000+ | 200+ |

  These thresholds are admin-configurable and **never exposed to end users** — the public explanation is qualitative ("verified onchain activity, contract deployments, GitHub contribution...").
- One holder = one pass, forever. Re-verification (every 7 days, backend-enforced cooldown) and tier upgrades update the *same* row/token — they never mint a new one and never consume additional supply.
- Tiers only move upward. A detected upgrade is *proposed*, not auto-applied — the holder must explicitly confirm ("Claim Gold Upgrade") before it's written.
- Supply cap (1,500) counts `minted AND NOT revoked` — a revoked credential frees its slot for a new unique holder.
- Discord (required) + GitHub (required) must both be connected to the same identity before verification can run. GitHub is link-only — it can never be used to log in, only to connect to an already-authenticated session.

## 3. Tech stack

- **Monorepo:** pnpm workspaces, Node 24, TypeScript 5.9
- **Frontend** (`artifacts/arc-pass`): React 19, Vite, Tailwind CSS v4, shadcn/ui (Radix primitives), Framer Motion, wouter (routing), TanStack Query, viem (wallet/address handling), html-to-image (client-side pass card export)
- **Backend** (`artifacts/api-server`): Express 5, esbuild bundle
- **Database**: PostgreSQL (Neon in current deployment) + Drizzle ORM
- **API contract**: OpenAPI spec (`lib/api-spec/openapi.yaml`) is the single source of truth → Orval codegen produces both the Zod validators (`lib/api-zod`) and the typed React Query hooks (`lib/api-client-react`). 43 operations.
- **Auth**: session-based, HTTP-only cookie, opaque DB-backed token (no JWT for sessions)
- **Signed authorizations**: `jose` for backend-issued replay-protected mint/upgrade tickets and OAuth CSRF state
- **Smart contracts**: Solidity, written but **not deployed** (see §6)

## 4. Data model

Postgres tables (`lib/db/src/schema/`):

- `users` — identity: stable per-provider IDs (`xUserId`, `discordUserId`, `githubUserId`) distinct from mutable usernames, plus which provider was used to log in
- `founderTiers` / `builderTiers` — admin-configurable tier definitions (name, emblem, description, active flag; builder tiers also carry the threshold pair above)
- `founderPasses` — one row per Founder identity (nullable `userId` until a pre-signup invite links on first login); variant, tier, company info, eligibility/claim status, mint fields, permanence timestamp
- `builderPasses` — one row per Builder identity; current tier, eligibility/claim status, cooldown timestamps, proposed-upgrade fields, suspend/revoke flags
- `builderTierHistory` — append-only upgrade log (including initial issuance)
- `builderVerificationSnapshots` — one row per verification/re-verification run: deterministic counts, Gemini qualitative summary, calculated tier, risk flags
- `mintAuthorizations` — single-use nonce tracking for signed mint/upgrade tickets (replay protection)
- `wallets` — up to 3 per user, one primary
- `sessions` — opaque token → user

## 5. Routes

Frontend (wouter): `/`, `/dashboard`, `/claim/founder`, `/claim/builder`, `/pass/:type/:id` (type is `founder`|`builder` — separate tables/id-spaces, so a bare `/pass/:id` would be ambiguous), `/admin`, `/faq`, `/docs`.

Admin panel is a single page with an internal section switcher (not sub-routes): Overview, Founder Passes, Builder Passes, Reviews & Upgrades, Tier Configuration, Mint Records, Settings. (The original spec listed 11 admin nav items; several were consolidated into these 7 where they'd otherwise just be filtered views of the same two tables — e.g. "Reviews & Upgrades" covers eligibility reviews + re-verifications + tier upgrades as one operational queue.)

API surface groups: `health`, `auth` (session + OAuth callbacks), `eligibility` (public preview), `passes` (founder + builder lifecycle, both user-facing and public-by-id), `users` (profile + wallets), `admin` (full CRUD across passes/tiers/uploads/mint records).

## 6. What's real vs. mocked

| Integration | Status |
|---|---|
| Database | Real (Neon Postgres) |
| X OAuth (login) | Real (OAuth 2.0 + PKCE), configured with real credentials |
| Discord OAuth (login + required Builder connection) | Real implementation; credentials added this session, not yet live-tested end-to-end |
| GitHub OAuth (required Builder connection, link-only) | Real implementation, configured with real credentials |
| Gemini | Real API wiring — used only for qualitative summaries (GitHub/ecosystem prose), **never** the source of truth for onchain counts |
| Onchain activity counts (qualifying tx / valid contracts) | Deterministic mock — real path needs `EXPLORER_API_URL`/`EXPLORER_API_KEY` wired to an actual indexer (currently a placeholder value, not a real indexer integration) |
| Onchain minting | Deterministic mock by default. Real path (`chain-adapter.ts`) signs EIP-191 authorizations with a relayer key and calls the deployed contracts via viem — activates only once `CHAIN_RPC_URL` + `RELAYER_PRIVATE_KEY` + both contract addresses are set |
| Smart contracts | **Written, not deployed.** `contracts/FounderPass.sol` and `contracts/BuilderPass.sol` are complete, auditable source (non-transferable, replay-protected, supply-capped, tier-upgrade events) but there's no compile/deploy toolchain wired up yet, and deployment has been explicitly held off for now |

## 7. Design system

Dark theme: deep graphite-navy (never pure black), restrained blue/violet/cyan accents. Light theme: warm off-white with a faint cool-tinted elevated-card surface. Inter for UI text, JetBrains Mono (tabular) for wallet addresses/pass numbers/tx hashes. Theme respects OS preference on first visit, persists after. Brand assets (Arc network mark, Webcoin Labs wordmarks, tier-rank emblem images) are wired in as the favicon, header icon, and seeded Builder tier emblems.

## 8. Current status

All 12 phases from the original product brief are implemented: audit, design system, header/nav/theme, landing + eligibility checker + scan animation, pass card variants (Founder Normal/Premium Black, Builder), claim flows (Founder + Builder 5-step), mint flow (connect wallet / manual address), re-verification + tier upgrade UI, dashboard, public pass pages, FAQ/docs, full admin panel, contracts (source only).

This session, the app was run end-to-end for real against the live database: schema pushed, tiers seeded, both dev servers started, and the full loop verified live — eligibility check, admin-created Founder invite showing up correctly in the public checker, mock-Discord login → session → admin panel, and the real X/GitHub OAuth redirects (correct client IDs, correct PKCE params) — everything confirmed working, not just typechecked. That pass also caught and fixed several real bugs that only surfaced at runtime (a React `setState`-during-render crash, a Windows-specific path bug in the Drizzle config, a bash-only `export` breaking the API server's dev script on Windows, and two shadcn UI primitives — `select.tsx` and `tooltip.tsx` — that were non-functional stubs from the original scaffold).

## 9. Known gaps / next steps

- Deploy `FounderPass.sol`/`BuilderPass.sol` (Hardhat or Foundry — neither is wired up yet) and set the four onchain-minting env vars once deployed
- Wire a real onchain indexer/explorer API for deterministic activity counts (currently mocked even when chain vars are set, until `EXPLORER_API_URL`/`EXPLORER_API_KEY` point at something real)
- Live-verify the Discord OAuth flow end-to-end now that credentials are configured
- A few `*_PRODUCTION_*` env vars (`PRODUCTION_URL`, `X_PRODUCTION_REDIRECT_URI`, `DISCORD_PRODUCTION_REDIRECT_URI`, `GITHUB_PRODUCTION_REDIRECT_URI`) were added to `.env` but aren't read anywhere in code yet — current design expects a single value per key that differs per deployment environment (see `.env.production.example`) rather than dual dev/prod values in one file; needs a decision on which pattern to standardize on
- No automated test suite yet — verification so far is manual (typecheck, build, live click-through)
