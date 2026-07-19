import assert from "node:assert/strict";
import test from "node:test";
import { buildBlockscoutStatsUrl, parseBlockscoutGasPrice } from "./blockscout-gas";

test("builds the Arc Blockscout stats URL without exposing the key elsewhere", () => {
  const url = new URL(buildBlockscoutStatsUrl("https://testnet.arcscan.app/", "secret-key"));
  assert.equal(url.origin, "https://testnet.arcscan.app");
  assert.equal(url.pathname, "/api/v2/stats");
  assert.equal(url.searchParams.get("apikey"), "secret-key");
});

test("builds a public Arcscan stats URL without requiring an API key", () => {
  const url = new URL(buildBlockscoutStatsUrl("https://testnet.arcscan.app"));
  assert.equal(url.pathname, "/api/v2/stats");
  assert.equal(url.searchParams.has("apikey"), false);
});

test("does not duplicate the Blockscout v2 path when it is already configured", () => {
  const url = new URL(buildBlockscoutStatsUrl("https://testnet.arcscan.app/api/v2"));
  assert.equal(url.pathname, "/api/v2/stats");
});

test("normalizes a bare Blockscout PRO host to Arc's stats route", () => {
  const url = new URL(buildBlockscoutStatsUrl("https://api.blockscout.com", "pro-key", "5042002"));
  assert.equal(url.pathname, "/5042002/api/v2/stats");
  assert.equal(url.searchParams.get("apikey"), "pro-key");
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
