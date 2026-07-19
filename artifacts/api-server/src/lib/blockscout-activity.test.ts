import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBlockscoutTransactionsUrl,
  summarizeBlockscoutTransactions,
  type BlockscoutTransaction,
} from "./blockscout-activity";

const wallet = "0x1111111111111111111111111111111111111111";
const otherWallet = "0x2222222222222222222222222222222222222222";

test("summarizes successful outgoing activity and contract deployments", () => {
  const transactions: BlockscoutTransaction[] = [
    {
      hash: "0x1",
      status: "ok",
      from: { hash: wallet },
      block_number: 12,
      timestamp: "2026-07-01T10:00:00.000000Z",
    },
    {
      hash: "0x2",
      status: "ok",
      from: { hash: wallet },
      block_number: 18,
      timestamp: "2026-07-02T10:00:00.000000Z",
      transaction_types: ["contract_creation"],
      created_contract: { hash: "0x9999999999999999999999999999999999999999" },
    },
    {
      hash: "0x2",
      status: "ok",
      from: { hash: wallet },
      block_number: 18,
      timestamp: "2026-07-02T10:00:00.000000Z",
      transaction_types: ["contract_creation"],
      created_contract: { hash: "0x9999999999999999999999999999999999999999" },
    },
    {
      hash: "0x3",
      status: "error",
      from: { hash: wallet },
      block_number: 20,
      timestamp: "2026-07-03T10:00:00.000000Z",
      transaction_types: ["contract_creation"],
      created_contract: { hash: "0x8888888888888888888888888888888888888888" },
    },
    {
      hash: "0x4",
      status: "ok",
      from: { hash: otherWallet },
      block_number: 99,
      timestamp: "2026-07-04T10:00:00.000000Z",
    },
  ];

  assert.deepEqual(summarizeBlockscoutTransactions(transactions, [wallet], new Date("2026-07-20T00:00:00.000Z")), {
    qualifyingTransactionCount: 2,
    validContractCount: 1,
    lastReviewedBlock: "18",
    firstTransactionAt: "2026-07-01T10:00:00.000Z",
    lastTransactionAt: "2026-07-02T10:00:00.000Z",
    transactionsLast30Days: 2,
    activeDaysLast30Days: 2,
  });
});

test("builds a Blockscout v2 transactions URL with safe pagination parameters", () => {
  const url = new URL(buildBlockscoutTransactionsUrl(
    "https://testnet.arcscan.app",
    wallet,
    { block_number: 42, index: 7, items_count: 50 },
    "arc-key",
  ));

  assert.equal(url.origin, "https://testnet.arcscan.app");
  assert.equal(url.pathname, `/api/v2/addresses/${wallet}/transactions`);
  assert.equal(url.searchParams.get("block_number"), "42");
  assert.equal(url.searchParams.get("index"), "7");
  assert.equal(url.searchParams.get("items_count"), "50");
  assert.equal(url.searchParams.get("apikey"), "arc-key");
});

test("normalizes a bare Blockscout PRO host to Arc's REST route", () => {
  const url = new URL(buildBlockscoutTransactionsUrl("https://api.blockscout.com", wallet, undefined, "pro-key", "5042002"));
  assert.equal(url.origin, "https://api.blockscout.com");
  assert.equal(url.pathname, `/5042002/api/v2/addresses/${wallet}/transactions`);
  assert.equal(url.searchParams.get("apikey"), "pro-key");
});
