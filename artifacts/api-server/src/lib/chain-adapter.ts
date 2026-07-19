import { createHash } from "crypto";
import {
  isAddress,
  getAddress,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  encodePacked,
  keccak256,
  hexToSignature,
  decodeEventLog,
  type Hex,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { logger } from "./logger";
import { configuration } from "./env";

export type Network = "arc" | "base";

export interface ChainMintResult {
  tokenId: string;
  transactionHash: string;
  contractAddress: string;
  network: Network;
}

export interface ChainActivityResult {
  qualifyingTransactionCount: number;
  validContractCount: number;
  lastReviewedBlock: string;
  // Optional "wrapped" display stats. Providers that cannot report them omit
  // them; the app then hides the wrapped panel instead of guessing.
  usdcSpent?: string;
  eurcSpent?: string;
  firstTransactionAt?: string;
}

export interface ChainAdapter {
  readonly mode: "onchain" | "development_mock" | "unavailable";
  readonly mintingAvailable: boolean;
  readonly activityAvailable: boolean;
  mintFounderPass(params: { identityHash: string; destinationWallet: string; network: Network; variant: string; metadataUri: string }): Promise<ChainMintResult>;
  mintBuilderPass(params: { identityHash: string; destinationWallet: string; network: Network; tierSlug: string; metadataUri: string }): Promise<ChainMintResult>;
  revokeFounderPass(params: { tokenId: string; reason: string }): Promise<{ transactionHash: string }>;
  revokeBuilderPass(params: { tokenId: string; reason: string }): Promise<{ transactionHash: string }>;
  upgradeBuilderTier(params: { tokenId: string; network: Network; tierSlug: string }): Promise<{ transactionHash: string }>;
  getBuilderOnchainActivity(walletAddresses: string[]): Promise<ChainActivityResult>;
}

export class VerificationUnavailableError extends Error {
  constructor() { super("Verification is temporarily unavailable. Please try again later."); }
}

export class MintingUnavailableError extends Error {
  constructor() { super("Onchain minting is temporarily unavailable."); }
}

/** Validates and returns the EIP-55 checksummed form of an address, or throws. */
export function checksumAddress(address: string): string {
  if (!isAddress(address)) {
    throw new Error("Invalid wallet address");
  }
  return getAddress(address);
}

/** Privacy-preserving identity hash — never puts a raw OAuth ID onchain. */
export function computeIdentityHash(passType: "founder" | "builder", userId: number): string {
  return `0x${createHash("sha256").update(`arc-pass:${passType}:${userId}`).digest("hex")}`;
}

const BUILDER_TIER_SLUGS = ["bronze", "silver", "gold", "platinum", "diamond"] as const;

function tierSlugToRank(tierSlug: string): number {
  const index = BUILDER_TIER_SLUGS.indexOf(tierSlug as (typeof BUILDER_TIER_SLUGS)[number]);
  return index < 0 ? 0 : index + 1;
}

// Minimal ABI surface the credential contracts expose to the backend relayer.
// Kept in lockstep with contracts/FounderPass.sol and contracts/BuilderPass.sol
// — each `authorizedX` call takes the split (v, r, s) of an EIP-191
// signature over the same message hash the contract reconstructs itself
// (see `signAuthorization` below), rather than a raw signature blob.
const FOUNDER_PASS_ABI = [
  {
    type: "function",
    name: "authorizedMint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "identityHash", type: "bytes32" },
      { name: "variant", type: "uint8" },
      { name: "metadataUri", type: "string" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "revoke",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }, { name: "reason", type: "string" }],
    outputs: [],
  },
] as const;

const BUILDER_PASS_ABI = [
  {
    type: "function",
    name: "authorizedMint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "identityHash", type: "bytes32" },
      { name: "tier", type: "uint8" },
      { name: "metadataUri", type: "string" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "authorizedUpgradeTier",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "newTier", type: "uint8" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revoke",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }, { name: "reason", type: "string" }],
    outputs: [],
  },
] as const;

const FOUNDER_PASS_MINT_EVENT = {
  type: "event",
  name: "FounderPassMinted",
  inputs: [
    { name: "tokenId", type: "uint256", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "identityHash", type: "bytes32", indexed: false },
    { name: "variant", type: "uint8", indexed: false },
  ],
} as const;

const BUILDER_PASS_MINT_EVENT = {
  type: "event",
  name: "BuilderPassMinted",
  inputs: [
    { name: "tokenId", type: "uint256", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "identityHash", type: "bytes32", indexed: false },
    { name: "tier", type: "uint8", indexed: false },
  ],
} as const;

function readMintedTokenId(
  logs: readonly { data: Hex; topics: readonly Hex[] }[],
  eventAbi: readonly unknown[],
): string {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({
        abi: eventAbi,
        data: log.data,
        topics: [...log.topics] as [Hex, ...Hex[]],
      });
      const tokenId = (decoded.args as { tokenId?: bigint } | undefined)?.tokenId;
      if (typeof tokenId === "bigint") return tokenId.toString();
    } catch {
      // Ignore unrelated receipt logs and continue looking for the mint event.
    }
  }
  throw new Error("Mint transaction did not emit the expected credential event");
}

function hashToInt(input: string, mod: number): number {
  const digest = createHash("sha256").update(input).digest();
  return digest.readUInt32BE(0) % mod;
}

/**
 * Deterministic, dependency-free stand-in used whenever chain RPC / relayer
 * credentials aren't configured. Produces stable (not random) results for a
 * given input so the same wallet always analyzes the same way in dev/demo.
 * Never used to decide anything security-sensitive — it only feeds the same
 * code paths a real adapter would, so the rest of the app never special-
 * cases "mock vs real".
 */
export const mockChainAdapter: ChainAdapter = {
  mode: "development_mock",
  mintingAvailable: true,
  activityAvailable: true,
  async mintFounderPass({ network }) {
    const seed = `founder-${Date.now()}-${Math.random()}`;
    return {
      tokenId: String(hashToInt(seed, 1_000_000) + 1),
      transactionHash: `0x${createHash("sha256").update(seed).digest("hex")}`,
      contractAddress: "0x0000000000000000000000000000000000000000",
      network,
    };
  },
  async mintBuilderPass({ network }) {
    const seed = `builder-${Date.now()}-${Math.random()}`;
    return {
      tokenId: String(hashToInt(seed, 1_000_000) + 1),
      transactionHash: `0x${createHash("sha256").update(seed).digest("hex")}`,
      contractAddress: "0x0000000000000000000000000000000000000000",
      network,
    };
  },
  async revokeFounderPass({ tokenId, reason }) {
    const seed = `revoke-founder-${tokenId}-${reason}-${Date.now()}`;
    return { transactionHash: `0x${createHash("sha256").update(seed).digest("hex")}` };
  },
  async revokeBuilderPass({ tokenId, reason }) {
    const seed = `revoke-builder-${tokenId}-${reason}-${Date.now()}`;
    return { transactionHash: `0x${createHash("sha256").update(seed).digest("hex")}` };
  },
  async upgradeBuilderTier({ tokenId, tierSlug }) {
    const seed = `upgrade-${tokenId}-${tierSlug}-${Date.now()}`;
    return { transactionHash: `0x${createHash("sha256").update(seed).digest("hex")}` };
  },
  async getBuilderOnchainActivity(walletAddresses) {
    if (walletAddresses.length === 0) {
      return { qualifyingTransactionCount: 0, validContractCount: 0, lastReviewedBlock: "0" };
    }
    const seedInput = [...walletAddresses].sort().join(",");
    const validContractCount = hashToInt(`contracts:${seedInput}`, 220);
    const qualifyingTransactionCount = hashToInt(`txs:${seedInput}`, 1100) + validContractCount * 4;
    const firstTxYear = 2021 + hashToInt(`first-year:${seedInput}`, 4);
    return {
      qualifyingTransactionCount,
      validContractCount,
      lastReviewedBlock: String(hashToInt(`block:${seedInput}`, 20_000_000) + 1_000_000),
      usdcSpent: (hashToInt(`usdc:${seedInput}`, 2_500_000) / 100).toFixed(2),
      eurcSpent: (hashToInt(`eurc:${seedInput}`, 900_000) / 100).toFixed(2),
      firstTransactionAt: new Date(Date.UTC(firstTxYear, hashToInt(`first-month:${seedInput}`, 12), 1 + hashToInt(`first-day:${seedInput}`, 28))).toISOString(),
    };
  },
};

function optionalDecimalAmount(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value.toFixed(2);
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) return value.trim();
  return undefined;
}

function optionalIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function getProviderActivity(walletAddresses: string[]): Promise<ChainActivityResult> {
  const explorerUrl = process.env.EXPLORER_API_URL;
  const explorerKey = process.env.EXPLORER_API_KEY;
  if (!explorerUrl || !explorerKey) throw new VerificationUnavailableError();
  const response = await fetch(explorerUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${explorerKey}` },
    body: JSON.stringify({ addresses: walletAddresses }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new VerificationUnavailableError();
  const payload = await response.json() as Partial<ChainActivityResult>;
  const { qualifyingTransactionCount, validContractCount, lastReviewedBlock } = payload;
  if (typeof qualifyingTransactionCount !== "number" || !Number.isSafeInteger(qualifyingTransactionCount) || typeof validContractCount !== "number" || !Number.isSafeInteger(validContractCount) || typeof lastReviewedBlock !== "string") {
    throw new VerificationUnavailableError();
  }
  const usdcSpent = optionalDecimalAmount(payload.usdcSpent);
  const eurcSpent = optionalDecimalAmount(payload.eurcSpent);
  const firstTransactionAt = optionalIsoDate(payload.firstTransactionAt);
  return {
    qualifyingTransactionCount,
    validContractCount,
    lastReviewedBlock,
    ...(usdcSpent !== undefined ? { usdcSpent } : {}),
    ...(eurcSpent !== undefined ? { eurcSpent } : {}),
    ...(firstTransactionAt !== undefined ? { firstTransactionAt } : {}),
  };
}

function buildViemChainAdapter(): ChainAdapter | null {
  const rpcUrl = process.env.CHAIN_RPC_URL;
  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  const founderContract = process.env.FOUNDER_PASS_CONTRACT_ADDRESS;
  const builderContract = process.env.BUILDER_PASS_CONTRACT_ADDRESS;

  if (!rpcUrl || !relayerKey || !founderContract || !builderContract) {
    return null;
  }

  const chainId = process.env.ARC_CHAIN_ID ? Number(process.env.ARC_CHAIN_ID) : undefined;
  if (!chainId || !Number.isSafeInteger(chainId) || chainId <= 0) {
    return null;
  }
  const arcChain: Chain | undefined = chainId
    ? defineChain({
        id: chainId,
        name: "Arc",
        nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
        rpcUrls: { default: { http: [rpcUrl] } },
        blockExplorers: process.env.EXPLORER_API_URL
          ? { default: { name: "Arcscan", url: process.env.EXPLORER_API_URL } }
          : undefined,
      })
    : undefined;

  const normalizedRelayerKey = relayerKey.startsWith("0x") ? relayerKey : `0x${relayerKey}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalizedRelayerKey)) {
    logger.error("chain minting is unavailable because RELAYER_PRIVATE_KEY is not a 32-byte hex key");
    return null;
  }
  const account = privateKeyToAccount(normalizedRelayerKey as Hex);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: arcChain, transport });
  const walletClient = createWalletClient({ account, chain: arcChain, transport });

  async function waitForSuccessfulReceipt(hash: Hex) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`Onchain transaction reverted: ${hash}`);
    return receipt;
  }

  // Reconstructs the exact message hash each contract's `_recoverSigner`
  // expects, signs it with the relayer key, and splits the result into the
  // (v, r, s) triple the contract's `ecrecover` call takes. The relayer key
  // here doubles as `authorizedSigner` on both contracts — in production
  // these can be split (e.g. a KMS-held signer distinct from the gas payer).
  async function signAuthorization(action: string, packedTypes: readonly string[], packedValues: readonly unknown[]) {
    const messageHash = keccak256(encodePacked(packedTypes as never, packedValues as never));
    const signature = await walletClient.signMessage({ account, message: { raw: messageHash } });
    const { v, r, s } = hexToSignature(signature);
    if (v === undefined) throw new Error(`${action}: signature missing recovery id`);
    return { v: Number(v), r, s };
  }

  return {
    mode: "onchain",
    mintingAvailable: true,
    activityAvailable: configuration.activityProviderConfigured,
    async mintFounderPass({ identityHash, destinationWallet, network, variant, metadataUri }) {
      const variantIndex = variant === "premium_black" ? 1 : 0;
      const { v, r, s } = await signAuthorization(
        "FounderPassMint",
        ["string", "uint256", "address", "bytes32", "uint8", "address", "string"],
        ["FounderPassMint", BigInt(chainId), destinationWallet, identityHash, variantIndex, founderContract, metadataUri],
      );

      const hash = await walletClient.writeContract({
        address: founderContract as Hex,
        abi: FOUNDER_PASS_ABI,
        functionName: "authorizedMint",
        args: [destinationWallet as Hex, identityHash as Hex, variantIndex, metadataUri, v, r, s],
        chain: arcChain,
      });
      const receipt = await waitForSuccessfulReceipt(hash);
      return {
        tokenId: readMintedTokenId(receipt.logs, [FOUNDER_PASS_MINT_EVENT]),
        transactionHash: hash,
        contractAddress: founderContract,
        network,
      };
    },
    async mintBuilderPass({ identityHash, destinationWallet, network, tierSlug, metadataUri }) {
      const tierRank = tierSlugToRank(tierSlug);
      const { v, r, s } = await signAuthorization(
        "BuilderPassMint",
        ["string", "uint256", "address", "bytes32", "uint8", "address", "string"],
        ["BuilderPassMint", BigInt(chainId), destinationWallet, identityHash, tierRank, builderContract, metadataUri],
      );

      const hash = await walletClient.writeContract({
        address: builderContract as Hex,
        abi: BUILDER_PASS_ABI,
        functionName: "authorizedMint",
        args: [destinationWallet as Hex, identityHash as Hex, tierRank, metadataUri, v, r, s],
        chain: arcChain,
      });
      const receipt = await waitForSuccessfulReceipt(hash);
      return {
        tokenId: readMintedTokenId(receipt.logs, [BUILDER_PASS_MINT_EVENT]),
        transactionHash: hash,
        contractAddress: builderContract,
        network,
      };
    },
    async revokeFounderPass({ tokenId, reason }) {
      const hash = await walletClient.writeContract({
        address: founderContract as Hex,
        abi: FOUNDER_PASS_ABI,
        functionName: "revoke",
        args: [BigInt(tokenId), reason],
        chain: arcChain,
      });
      await waitForSuccessfulReceipt(hash);
      return { transactionHash: hash };
    },
    async revokeBuilderPass({ tokenId, reason }) {
      const hash = await walletClient.writeContract({
        address: builderContract as Hex,
        abi: BUILDER_PASS_ABI,
        functionName: "revoke",
        args: [BigInt(tokenId), reason],
        chain: arcChain,
      });
      await waitForSuccessfulReceipt(hash);
      return { transactionHash: hash };
    },
    async upgradeBuilderTier({ tokenId, tierSlug }) {
      const tierRank = tierSlugToRank(tierSlug);
      const { v, r, s } = await signAuthorization(
        "BuilderTierUpgrade",
        ["string", "uint256", "uint256", "uint8", "address"],
        ["BuilderTierUpgrade", BigInt(chainId), BigInt(tokenId), tierRank, builderContract],
      );

      const hash = await walletClient.writeContract({
        address: builderContract as Hex,
        abi: BUILDER_PASS_ABI,
        functionName: "authorizedUpgradeTier",
        args: [BigInt(tokenId), tierRank, v, r, s],
        chain: arcChain,
      });
      await waitForSuccessfulReceipt(hash);
      return { transactionHash: hash };
    },
    async getBuilderOnchainActivity(walletAddresses) {
      return getProviderActivity(walletAddresses);
    },
  };
}

const unavailableChainAdapter: ChainAdapter = {
  mode: "unavailable",
  mintingAvailable: false,
  activityAvailable: configuration.activityProviderConfigured,
  async mintFounderPass() { throw new MintingUnavailableError(); },
  async mintBuilderPass() { throw new MintingUnavailableError(); },
  async revokeFounderPass() { throw new MintingUnavailableError(); },
  async revokeBuilderPass() { throw new MintingUnavailableError(); },
  async upgradeBuilderTier() { throw new MintingUnavailableError(); },
  async getBuilderOnchainActivity(walletAddresses) { return getProviderActivity(walletAddresses); },
};

export const chainAdapter: ChainAdapter = buildViemChainAdapter()
  ?? (configuration.enableDevMocks ? mockChainAdapter : unavailableChainAdapter);

if (chainAdapter.mode === "development_mock") {
  logger.warn("chain-adapter is using explicitly enabled development mocks");
} else if (chainAdapter.mode === "unavailable") {
  logger.info("chain minting is unavailable; requests will fail closed until configured");
}
