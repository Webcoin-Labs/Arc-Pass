# Arc Pass

A verified credential platform for Arc founders and builders. Two
non-transferable identity credentials — Founder Pass (invite-only,
permanent) and Builder Pass (activity-based, capped at 1,500 holders,
upgradeable) — verified through OAuth, onchain activity, and GitHub
contribution, then recorded onchain.

## Run & Operate

- `pnpm --filter @workspace/arc-pass run dev` — run the frontend (proxies `/api` and `/uploads` to the API server, see `API_PROXY_TARGET`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `PORT`, default use 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — seed Founder/Builder tier configuration (Bronze–Diamond, placeholder Founder tiers)
- Copy `.env.example` to `.env` and fill in what you have — every external integration has a working mock/fallback when unset (see "Architecture decisions")

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + shadcn/ui (Radix) + Framer Motion + wouter + viem + html-to-image
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec) — React Query hooks + Zod schemas
- Signed authorizations: `jose` (mint/upgrade tickets, OAuth state)
- Build: esbuild (CJS bundle, API); Vite (frontend)
- Smart contracts: Solidity source in `contracts/` (not yet deployed — see `contracts/README.md`)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle table definitions (users, founderTiers, builderTiers, founderPasses, builderPasses, builderVerificationSnapshots, builderTierHistory, mintAuthorizations, wallets, sessions)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, eligibility, passes, users, admin)
- `artifacts/api-server/src/lib/` — auth middleware, chain adapter, Gemini adapter, OAuth providers, signed claim tickets, tier calculation, uploads
- `artifacts/arc-pass/src/pages/` — landing, dashboard, claim flows, pass detail, FAQ, docs, admin
- `artifacts/arc-pass/src/components/` — shared UI (header, pass cards, mint modal, admin panels, shadcn primitives)
- `contracts/` — `FounderPass.sol`, `BuilderPass.sol` (not yet deployed)

## Architecture decisions

- **Auth**: session-based with an HTTP-only cookie (`arc_session`), opaque DB-backed token (no JWT). Real OAuth 2.0 for X (PKCE), Discord, and GitHub when `*_CLIENT_ID`/`*_CLIENT_SECRET`/`*_REDIRECT_URI` are set; falls back to a demo identity otherwise. GitHub is link-only (never a login method) — Founder login is X or Discord, Builder verification additionally requires Discord + GitHub linked to the same account.
- **Founder eligibility** is 100% admin-controlled (invite by X/Discord handle, pre- or post-signup) — never derived from activity. Variant (Normal / Premium Black) and tier are locked forever once minted.
- **Builder tier** is calculated deterministically from onchain activity (`chain-adapter.ts`) plus a contract-deployment baseline gate — Gemini (`gemini-adapter.ts`) only produces qualitative summaries, never tier-deciding counts. Exact thresholds live in the `builder_tiers` table (admin-editable) and are never exposed to non-admins.
- **Onchain minting** goes through `chain-adapter.ts`: a deterministic mock by default, or real viem calls (with EIP-191–signed authorizations matching the deployed contracts) once `CHAIN_RPC_URL` + `RELAYER_PRIVATE_KEY` + both contract addresses are set. See `contracts/README.md` — contracts are written but not deployed.
- **Replay protection** is layered: `mint_authorizations` tracks single-use nonces backend-side (`signed-claims.ts`) before a signature is ever requested, and the contracts independently reject a replayed signature via `usedSignatures`.
- **Builder supply cap (1,500)** excludes revoked passes — `mintedAndNotRevoked()` in `serializers.ts` is the one place that rule lives, mirrored by `activeSupply` in `BuilderPass.sol`.
- Local dev runs the frontend (Vite) and API as separate processes/ports — `vite.config.ts` proxies `/api` and `/uploads` to `API_PROXY_TARGET` so relative fetches work outside Replit's own routing.

## Product routes

- **`/`** — Eligibility checker (X/Discord username preview only, never authenticates) with scan animation + both Founder/Builder result cards always shown
- **`/dashboard`** — Auth-gated: both passes, profile, connected accounts, re-verification, tier upgrades
- **`/claim/founder`**, **`/claim/builder`** — claim flows (Builder is 5 steps: Discord, GitHub, wallets, review, mint)
- **`/pass/:type/:id`** — public pass page (`type` is `founder` or `builder` — the two are separate tables/id spaces, so a bare `/pass/:id` would be ambiguous)
- **`/admin`** — Overview, Founder Passes, Builder Passes, Reviews & Upgrades, Tier Configuration, Mint Records, Settings (single page, section switcher — see note below)
- **`/faq`**, **`/docs`**

Note: the spec's admin nav lists 11 sections (Founder Applications, Founder
Passes, Eligibility Reviews, Re-verifications, Tier Upgrades, Company Assets
among them). These are consolidated into the 7 above where they'd otherwise
just be thin filtered views of the same two tables — "Reviews & Upgrades"
covers eligibility reviews + re-verifications + tier upgrades in one
operational queue, and company logo upload lives inline in the Founder Pass
editor rather than a separate asset library (there's no deduplicated
"company" entity in the data model).

## Gotchas

- The `label.tsx` shadcn component must use `import * as LabelPrimitive from "@radix-ui/react-label"` (namespace import), not a named import
- Re-run codegen (`pnpm --filter @workspace/api-spec run codegen`) after every OpenAPI spec change, then `pnpm run typecheck:libs` to refresh the `lib/db`/`lib/api-zod` composite build output — `tsc -p` in the artifacts (non-`--build` mode) reads those `dist/*.d.ts` files via project references, not live source, so stale libs cause misleading type errors downstream
- Orval's generated React Query hooks type `options.query` as the raw (non-`Partial`) `UseQueryOptions`, which react-query v5 requires `queryKey` on — pass it explicitly via the hook's exported `getXQueryKey()` helper whenever you override `retry`/`enabled` (see any page for the pattern)
- Auth middleware (`requireAuth`/`requireAdmin`) attaches `req.user` — access it with `(req as AuthedRequest).user` (type exported from `lib/auth.ts`)
- `select.tsx` and `tooltip.tsx` were originally broken stubs (a native `<select>` faking the Radix API, and a self-importing circular tooltip) — both now wrap the real `@radix-ui/react-*` primitives that were already a dependency

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
