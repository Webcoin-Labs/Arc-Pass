import assert from "node:assert/strict";
import test from "node:test";
import { buildBlockscoutStatsUrl, parseBlockscoutGasPrice } from "./blockscout-gas";

test("builds the Arc Blockscout stats URL without exposing the key elsewhere", () => {
  const url = new URL(buildBlockscoutStatsUrl("https://testnet.arcscan.app/", "secret-key"));
  assert.equal(url.origin, "https://testnet.arcscan.app");
  assert.equal(url.pathname, "/api/v2/stats");
  assert.equal(url.searchParams.get("apikey"), "secret-key");
});

test("uses Blockscout's average gas price", () => {
  assert.equal(parseBlockscoutGasPrice({ gas_prices: { average: 0.015 } }), 0.015);
});

test("falls back to Blockscout's static gas price", () => {
  assert.equal(parseBlockscoutGasPrice({ static_gas_price: "0.02" }), 0.02);
});

test("rejects an invalid gas price instead of displaying fake data", () => {
  assert.throws(() => parseBlockscoutGasPrice({ static_gas_price: "not-a-number" }));
});
