# Arc Pass credential contracts

This directory holds the two on-chain credential contracts referenced by
`artifacts/api-server/src/lib/chain-adapter.ts`:

- `FounderPass.sol` — permanent, non-transferable Founder credential
- `BuilderPass.sol` — non-transferable Builder credential with unlimited contract supply and in-place tier upgrades

## Status: not yet deployed

These contracts are reviewed source (not a substitute for an independent
security audit) — but there is no build
toolchain (Hardhat/Foundry), no compiled ABI/bytecode artifact, and no
deployment in this repository. That's intentional: compiling and deploying
requires an RPC endpoint and a funded deployer key, neither of which is
available in this environment. The backend already has a clean seam for
wiring this up (see below) — nothing else in the app needs to change once
real infrastructure exists.

### To take this to production

1. Add a build toolchain (Hardhat is the more common choice for this ABI
   style): `pnpm add -D hardhat @nomicfoundation/hardhat-toolbox` inside a
   new `contracts` package, or use Foundry if preferred.
2. Compile, deploy `FounderPass` and `BuilderPass` to your target network
   (Arc mainnet/testnet, Base, etc.), passing a multisig or admin address
   and an `authorizedSigner` address (the address whose private key signs
   mint/upgrade authorizations — see below).
3. Set these environment variables on the API server:
   - `CHAIN_RPC_URL` — RPC endpoint for the target network
   - `ARC_CHAIN_ID` — numeric chain ID of that same RPC/network (required for replay protection)
   - `RELAYER_PRIVATE_KEY` — private key of the `authorizedSigner` account (also pays gas for relayed mints)
   - `FOUNDER_PASS_CONTRACT_ADDRESS` — deployed `FounderPass` address
   - `BUILDER_PASS_CONTRACT_ADDRESS` — deployed `BuilderPass` address
   - `EXPLORER_API_URL` / `EXPLORER_API_KEY` — an indexer/explorer API for computing real `qualifyingTransactionCount` / `validContractCount` (see the TODO in `chain-adapter.ts`)

Once all five chain-related variables are set, `chain-adapter.ts` switches
from `mode: "mock"` to `mode: "onchain"` automatically and starts signing
real EIP-191 authorizations with the relayer key before calling
`authorizedMint` / `authorizedUpgradeTier`.

## Design notes

- **Non-transferable by default.** The ERC-721-compatible transfer and
  approval methods are present so wallets recognize the collection, but every
  one reverts as non-transferable. These are identity credentials, not
  tradable assets.
- **Wallet-visible metadata.** Each mint stores an immutable `tokenURI` that
  resolves to public ERC-721 JSON metadata. The current backend serves this
  from `/api/metadata/{founder|builder}/{id}` and the image from the public
  share image route. For long-term independence from the API, replace that
  HTTPS URI with an `ipfs://` URI from a pinned metadata/image upload.
  `APP_URL` must be the public origin that serves those API routes (in this
  deployment, the Vercel origin rewrites `/api/*` to Railway). HTTPS is enough
  for wallet display; IPFS is an optional permanence layer, not a requirement.
- **One credential per identity.** `identityHash` is a privacy-preserving
  hash of the internal (passType, userId) pair — never a raw OAuth ID —
  and is enforced unique via `identityToTokenId`.
- **Replay-protected authorizations.** Every mint/upgrade requires an
  EIP-191 signature from `authorizedSigner` over a domain-separated,
  chain-bound message hash (`"FounderPassMint"` / `"BuilderPassMint"` /
  `"BuilderTierUpgrade"` prefixes), including the recipient and immutable
  metadata URI for mints. Each exact signed message can only be consumed once
  on-chain (`usedSignatures`), and signatures reject malleable `s` values. The backend additionally tracks its own
  nonce-based authorization records (`mint_authorizations` table via
  `api-server/src/lib/signed-claims.ts`) before it ever asks the relayer to
  sign anything — so replay is rejected at both layers.
- **No permanent Builder contract cap.** `totalSupply` records every original
  mint and never decreases. The backend atomically limits original claims by
  release phase before authorizing a mint; the repository production template
  currently configures Phase 1 as 2,499 claims.
- **Tier only moves upward.** `authorizedUpgradeTier` reverts if
  `newTier <= currentTier`, enforced identically in the backend
  (`isUpgrade()` in `tier-config.ts`) before it ever requests a signature.
- **Safer key rotation.** Admin and authorized-signer changes are two-step;
  the proposed address must explicitly accept before it becomes active.
