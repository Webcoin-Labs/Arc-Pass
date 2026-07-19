export interface BlockscoutTransaction {
  hash?: unknown;
  status?: unknown;
  from?: { hash?: unknown } | null;
  block_number?: unknown;
  timestamp?: unknown;
  transaction_types?: unknown;
  created_contract?: { hash?: unknown } | null;
}

export interface BlockscoutPageParams {
  block_number?: string | number;
  index?: string | number;
  items_count?: string | number;
}

export interface BlockscoutActivitySummary {
  qualifyingTransactionCount: number;
  validContractCount: number;
  lastReviewedBlock: string;
  firstTransactionAt?: string;
  lastTransactionAt?: string;
  transactionsLast30Days: number;
  activeDaysLast30Days: number;
}

function normalizedAddress(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function isSuccessful(value: unknown): boolean {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";
  return status === "ok" || status === "success";
}

function blockNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isContractCreation(transaction: BlockscoutTransaction): boolean {
  const types = Array.isArray(transaction.transaction_types)
    ? transaction.transaction_types.filter((value): value is string => typeof value === "string")
    : [];
  return types.some((type) => type.toLowerCase() === "contract_creation")
    || Boolean(transaction.created_contract && typeof transaction.created_contract === "object");
}

/**
 * Converts Blockscout v2 transaction rows into the activity signal used by
 * Builder tiers. Only successful transactions sent by an ownership-verified
 * wallet count; inbound transfers and failed rows do not qualify.
 */
export function summarizeBlockscoutTransactions(
  transactions: readonly BlockscoutTransaction[],
  walletAddresses: readonly string[],
  analyzedAt = new Date(),
): BlockscoutActivitySummary {
  const wallets = new Set(walletAddresses.map(normalizedAddress).filter((value): value is string => value !== null));
  const seenHashes = new Set<string>();
  let qualifyingTransactionCount = 0;
  let validContractCount = 0;
  let lastReviewedBlock = 0;
  let firstTransactionAt: string | undefined;
  let lastTransactionAt: string | undefined;
  let transactionsLast30Days = 0;
  const activeDaysLast30Days = new Set<string>();
  const recentCutoff = analyzedAt.getTime() - 30 * 86_400_000;

  for (const transaction of transactions) {
    const hash = normalizedAddress(transaction.hash);
    const sender = normalizedAddress(transaction.from?.hash);
    if (!hash || !sender || !wallets.has(sender) || !isSuccessful(transaction.status) || seenHashes.has(hash)) continue;
    seenHashes.add(hash);
    qualifyingTransactionCount += 1;

    const block = blockNumber(transaction.block_number);
    if (block !== null) lastReviewedBlock = Math.max(lastReviewedBlock, block);

    const createdAt = timestamp(transaction.timestamp);
    if (createdAt && (!firstTransactionAt || createdAt < firstTransactionAt)) firstTransactionAt = createdAt;
    if (createdAt && (!lastTransactionAt || createdAt > lastTransactionAt)) lastTransactionAt = createdAt;
    if (createdAt) {
      const createdAtMs = new Date(createdAt).getTime();
      if (createdAtMs >= recentCutoff && createdAtMs <= analyzedAt.getTime()) {
        transactionsLast30Days += 1;
        activeDaysLast30Days.add(createdAt.slice(0, 10));
      }
    }
    if (isContractCreation(transaction)) validContractCount += 1;
  }

  return {
    qualifyingTransactionCount,
    validContractCount,
    lastReviewedBlock: String(lastReviewedBlock),
    ...(firstTransactionAt ? { firstTransactionAt } : {}),
    ...(lastTransactionAt ? { lastTransactionAt } : {}),
    transactionsLast30Days,
    activeDaysLast30Days: activeDaysLast30Days.size,
  };
}

function basePath(url: URL, chainId: string): string {
  const path = url.pathname.replace(/\/+$/, "");
  if (url.hostname.toLowerCase() === "api.blockscout.com" && (!path || path === "/v2" || path === "/v2/api")) {
    return `/${/^\d+$/.test(chainId) ? chainId : "5042002"}`;
  }
  if (path.endsWith("/api/v2")) return path.slice(0, -"/api/v2".length);
  if (path.endsWith("/api")) return path.slice(0, -"/api".length);
  return path;
}

export function buildBlockscoutTransactionsUrl(
  baseUrl: string,
  address: string,
  pageParams?: BlockscoutPageParams,
  apiKey?: string,
  chainId = "5042002",
): string {
  const url = new URL(baseUrl);
  url.pathname = `${basePath(url, chainId)}/api/v2/addresses/${encodeURIComponent(address)}/transactions`.replace(/\/{2,}/g, "/");
  url.search = "";
  for (const name of ["block_number", "index", "items_count"] as const) {
    const value = pageParams?.[name];
    if (typeof value === "string" || typeof value === "number") url.searchParams.set(name, String(value));
  }
  if (apiKey?.trim()) url.searchParams.set("apikey", apiKey.trim());
  return url.toString();
}

export function isBlockscoutExplorerUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return hostname === "arcscan.app"
      || hostname.endsWith(".arcscan.app")
      || hostname === "blockscout.com"
      || hostname.endsWith(".blockscout.com")
      || url.pathname.includes("/api/v2");
  } catch {
    return false;
  }
}
