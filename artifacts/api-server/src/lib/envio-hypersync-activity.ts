import type { BlockscoutTransaction } from "./blockscout-activity";

/** Arc Testnet's official HyperSync endpoint (chain id 5042002). */
export const DEFAULT_ENVIO_HYPERSYNC_URL = "https://arc-testnet.hypersync.xyz";

export interface EnvioHyperSyncPage {
  archiveHeight: number;
  nextBlock: number;
  transactions: BlockscoutTransaction[];
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function nonNegativeInteger(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function blockTimestamp(value: unknown): string | undefined {
  const seconds = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  const date = new Date(seconds * 1_000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function successfulStatus(value: unknown): boolean {
  return value === 1 || value === "1" || (typeof value === "string" && ["ok", "success"].includes(value.toLowerCase()));
}

/**
 * Produces the minimal query required for the Builder Pass policy: successful
 * outbound transactions from ownership-verified wallets plus contract creates.
 * It intentionally does not request token balances, inputs, or inbound rows.
 */
export function buildEnvioHyperSyncQuery(walletAddresses: readonly string[], fromBlock: number): Record<string, unknown> {
  return {
    from_block: fromBlock,
    transactions: [{ from: [...walletAddresses], status: 1 }],
    field_selection: {
      block: ["number", "timestamp"],
      transaction: ["block_number", "hash", "from", "to", "contract_address", "status"],
    },
  };
}

/**
 * Normalizes HyperSync JSON into the same conservative transaction shape used
 * by the existing Blockscout summarizer. Keeping one summarizer guarantees the
 * tier policy is identical regardless of the provider that supplied the data.
 */
export function parseEnvioHyperSyncPage(payload: unknown): EnvioHyperSyncPage {
  const root = record(payload);
  const data = record(root?.data);
  const archiveHeight = nonNegativeInteger(root?.archive_height ?? root?.archiveHeight);
  const nextBlock = nonNegativeInteger(root?.next_block ?? root?.nextBlock);
  if (!data || archiveHeight === null || nextBlock === null) {
    throw new Error("Envio HyperSync returned an invalid page");
  }

  const timestampsByBlock = new Map<number, string>();
  if (Array.isArray(data.blocks)) {
    for (const rawBlock of data.blocks) {
      const block = record(rawBlock);
      const number = nonNegativeInteger(block?.number);
      const timestamp = blockTimestamp(block?.timestamp);
      if (number !== null && timestamp) timestampsByBlock.set(number, timestamp);
    }
  }

  if (!Array.isArray(data.transactions)) throw new Error("Envio HyperSync returned no transactions");
  const transactions = data.transactions.flatMap((rawTransaction): BlockscoutTransaction[] => {
    const transaction = record(rawTransaction);
    if (!transaction) return [];
    const blockNumber = nonNegativeInteger(transaction.block_number ?? transaction.blockNumber);
    const contractAddress = string(transaction.contract_address ?? transaction.contractAddress);
    return [{
      hash: string(transaction.hash),
      status: successfulStatus(transaction.status) ? "success" : "error",
      from: { hash: string(transaction.from) },
      block_number: blockNumber ?? undefined,
      timestamp: blockNumber === null ? undefined : timestampsByBlock.get(blockNumber),
      ...(contractAddress ? { transaction_types: ["contract_creation"], created_contract: { hash: contractAddress } } : {}),
    }];
  });

  return { archiveHeight, nextBlock, transactions };
}
