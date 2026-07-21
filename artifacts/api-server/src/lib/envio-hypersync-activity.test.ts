import test from "node:test";
import assert from "node:assert/strict";
import { buildEnvioHyperSyncQuery, parseEnvioHyperSyncPage } from "./envio-hypersync-activity";
import { summarizeBlockscoutTransactions } from "./blockscout-activity";

const wallet = "0x1111111111111111111111111111111111111111";

test("builds a minimal successful-outbound HyperSync query", () => {
  assert.deepEqual(buildEnvioHyperSyncQuery([wallet], 42), {
    from_block: 42,
    transactions: [{ from: [wallet], status: 1 }],
    field_selection: {
      block: ["number", "timestamp"],
      transaction: ["block_number", "hash", "from", "to", "contract_address", "status"],
    },
  });
});

test("normalizes HyperSync transactions into the shared conservative activity policy", () => {
  const page = parseEnvioHyperSyncPage({
    archive_height: 800,
    next_block: 800,
    data: {
      blocks: [{ number: 700, timestamp: 1_784_635_200 }],
      transactions: [
        { hash: "0x1", from: wallet, block_number: 700, status: 1 },
        { hash: "0x2", from: wallet, block_number: 700, status: 1, contract_address: "0x9999999999999999999999999999999999999999" },
        { hash: "0x3", from: wallet, block_number: 700, status: 0 },
      ],
    },
  });

  assert.equal(page.archiveHeight, 800);
  assert.equal(page.nextBlock, 800);
  assert.deepEqual(summarizeBlockscoutTransactions(page.transactions, [wallet], new Date("2026-07-22T00:00:00.000Z")), {
    qualifyingTransactionCount: 2,
    validContractCount: 1,
    lastReviewedBlock: "700",
    firstTransactionAt: "2026-07-21T12:00:00.000Z",
    lastTransactionAt: "2026-07-21T12:00:00.000Z",
    transactionsLast30Days: 2,
    activeDaysLast30Days: 1,
  });
});

test("rejects incomplete HyperSync responses rather than treating them as zero activity", () => {
  assert.throws(() => parseEnvioHyperSyncPage({ data: { transactions: [] } }), /invalid page/);
});
