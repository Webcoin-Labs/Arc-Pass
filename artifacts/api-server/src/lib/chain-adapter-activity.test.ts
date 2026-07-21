import test from "node:test";
import assert from "node:assert/strict";
import { fetchBlockscoutWalletTransactions } from "./chain-adapter";

const wallet = "0x1111111111111111111111111111111111111111";

test("retains an Arcscan page captured before a later pagination failure", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      return new Response(JSON.stringify({
        items: [{ hash: "0xcaptured", status: "ok", from: { hash: wallet }, block_number: 42 }],
        next_page_params: { block_number: 42, index: 0, items_count: 50 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("upstream unavailable", { status: 500 });
  }) as typeof fetch;

  try {
    const result = await fetchBlockscoutWalletTransactions("https://testnet.arcscan.app", undefined, wallet);
    assert.equal(calls, 2);
    assert.equal(result.complete, false);
    assert.equal(result.transactions.length, 1);
    assert.equal(result.transactions[0]?.hash, "0xcaptured");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
