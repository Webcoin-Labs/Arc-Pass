# Arc Pass

Arc Pass is a verified-credential platform for Arc founders and builders. It
issues two non-transferable credentials: an invite-only Founder Pass and an
activity-based Builder Pass. Eligibility is verified through OAuth, GitHub,
wallet ownership signatures, and real onchain/indexer data before a credential
is recorded onchain.

## Run and operate

- `pnpm --filter @workspace/arc-pass run dev` — run the Vite frontend.
- `pnpm --filter @workspace/api-server run dev` — run the API server.
- `pnpm run typecheck` — typecheck every workspace package.
- `pnpm run build` — typecheck and build every package.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API clients after OpenAPI changes.
- `pnpm --filter @workspace/db run push` / `seed` — development database setup only.

Copy `.env.example` to `.env`. Development mocks require the explicit
`ENABLE_DEV_MOCKS=true` flag and are rejected when `NODE_ENV=production`.
Production never fabricates eligibility, tier, activity counts, or mint
transactions when an integration is missing.

## Architecture decisions

- Sessions use an HttpOnly `arc_session` cookie while only an HMAC digest is stored in PostgreSQL.
- X and Discord can establish a login; GitHub is link-only and is required before claiming.
- Wallets must sign a server nonce; only ownership-verified wallets can receive a pass.
- Builder verification requires a real activity provider. Missing or failed indexer configuration returns `Verification is temporarily unavailable.`
- Onchain minting uses viem and EIP-191 authorizations against the deployed contracts. Development chain mocks are opt-in only.
- The Builder Wave 1 onchain mint allocation is controlled by the backward-compatible `BUILDER_PHASE_CLAIM_LIMIT` variable (2,499 by default). Inventory claims do not consume it. The Solidity Builder contract has no permanent cap; revocation does not restore mint supply or identity history.
- Founder variants are Normal and Premium. The fixed Founder tier catalog contains exactly Emerging Founder and Premier Founder.
- Discord membership is best-effort supporting evidence. `ARC_DISCORD_PRIMARY_ROLE_IDS` accepts up to two role IDs and the pass displays membership date plus whether each role is present.

## Important production configuration

Production requires `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, OAuth state and
mint signing keys, complete OAuth groups, complete chain minting variables
(including `ARC_CHAIN_ID`), a real activity provider, and all five Cloudflare
R2 variables. Local upload storage is ephemeral and is rejected in production.

## Smart contracts

`contracts/FounderPass.sol` and `contracts/BuilderPass.sol` are soulbound,
replay-protected credential contracts with HTTPS metadata URIs. HTTPS metadata
works without IPFS; IPFS is optional if immutable pinning is desired. The source
has not received a formal third-party audit, so deploy only after an external
review and a verified deployment checklist.

## Known operational risks

- `railway.json` currently uses Drizzle `push` before deploy. Replace it with a
  reviewed migration runner before applying schema changes automatically in a
  production environment.
- `pnpm audit --prod` currently reports transitive `ws`/`uuid` advisories in
  the wallet-connector dependency tree. Upgrade the upstream RainbowKit/Wagmi
  connector set when a compatible patched release is available.
