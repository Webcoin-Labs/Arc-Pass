# Arc Pass

Verified credential platform for Arc network founders and builders — proof of contribution, portable network identity, recorded onchain. Not an NFT minting template: Arc Pass issues two non-transferable identity credentials, **Founder Pass** and **Builder Pass**.

Powered by [Webcoin Labs](https://webcoin.labs).

## What it is

| | Founder Pass | Builder Pass |
|---|---|---|
| Eligibility | Admin invite-only (X or Discord handle) | Verified onchain activity + GitHub contribution |
| Supply | Uncapped, admin-controlled | Capped at 1,500 unique holders |
| Permanence | Permanent once minted — variant and tier locked forever | Upgrades in place; identity and pass number never change |
| Variants / Tiers | Normal / Premium Black + configurable Founder tiers | Bronze → Silver → Gold → Platinum → Diamond |

See [`ARC_PASS_OVERVIEW.md`](./ARC_PASS_OVERVIEW.md) for the full product and architecture writeup (credential rules, data model, what's real vs. mocked, current status).

## Stack

- **Monorepo:** pnpm workspaces, Node 24, TypeScript 5.9
- **Frontend:** React 19, Vite, Tailwind CSS v4, shadcn/ui (Radix), Framer Motion, wouter, TanStack Query, viem
- **API:** Express 5
- **Database:** PostgreSQL + Drizzle ORM
- **API contract:** OpenAPI (`lib/api-spec/openapi.yaml`) → Orval-generated Zod validators + React Query hooks
- **Smart contracts:** Solidity (`contracts/`) — written, not yet deployed

## Getting started

```bash
pnpm install
cp .env.example .env   # fill in what you have — see comments in the file
pnpm --filter @workspace/db run push   # push schema to your Postgres/Neon database
pnpm --filter @workspace/db run seed   # seed Founder/Builder tier configuration
```

Run the API and frontend as two processes:

```bash
pnpm --filter @workspace/api-server run dev   # http://localhost:8080
pnpm --filter @workspace/arc-pass run dev     # http://localhost:5173 (proxies /api to the API server)
```

Other useful commands:

```bash
pnpm run typecheck                                          # full workspace typecheck
pnpm run build                                               # typecheck + build all packages
pnpm --filter @workspace/api-spec run codegen                 # regenerate API hooks/schemas after an OpenAPI change
```

Every external integration (OAuth, Gemini, onchain minting, activity indexing) has a documented env var set in [`.env.example`](./.env.example) and fails closed / falls back to a mock when unset — see `replit.md` for exactly what's mocked vs. real at any given time.

## Project structure

```
artifacts/
  arc-pass/       React frontend — pages, components, design system
  api-server/     Express API — routes, auth, chain/Gemini adapters
lib/
  api-spec/       OpenAPI spec (source of truth) + Orval codegen config
  api-zod/        Generated Zod validators
  api-client-react/  Generated React Query hooks
  db/             Drizzle schema, migrations, seed script
contracts/        FounderPass.sol, BuilderPass.sol (not deployed — see contracts/README.md)
```

## Documentation

- [`ARC_PASS_OVERVIEW.md`](./ARC_PASS_OVERVIEW.md) — product positioning, credential rules, architecture, current status, known gaps
- [`replit.md`](./replit.md) — day-to-day dev notes: run/operate commands, architecture decisions, gotchas
- [`contracts/README.md`](./contracts/README.md) — smart contract design notes and deployment checklist
- [`.env.example`](./.env.example) / [`.env.production.example`](./.env.production.example) — required environment variables for local dev and production

## Security

Never commit `.env` or any file with real credentials — `.env`, `.env.local`, `.env.production`, and `.env.development` are gitignored. Only `.env.example` and `.env.production.example` (placeholder templates) are meant to be committed.
