import test from "node:test";
import assert from "node:assert/strict";
import { countWords, fingerprintRequesterIp, FOUNDER_REQUEST_MAX_WORDS, validateFounderRequest } from "./founder-request";

test("Founder request normalizes a leading @ and lowercase handle", () => {
  assert.deepEqual(validateFounderRequest({ xUsername: "  @SolRishu ", description: "I am building useful tools for the Arc ecosystem." }), {
    xUsername: "solrishu",
    description: "I am building useful tools for the Arc ecosystem.",
  });
});

test("Founder request accepts at most 500 words", () => {
  const limit = Array.from({ length: FOUNDER_REQUEST_MAX_WORDS }, () => "word").join(" ");
  assert.equal(countWords(limit), FOUNDER_REQUEST_MAX_WORDS);
  assert.doesNotThrow(() => validateFounderRequest({ xUsername: "founder", description: limit }));
  const overLimit = `${limit} word`;
  assert.throws(() => validateFounderRequest({ xUsername: "founder", description: overLimit }), /500 words/);
});

test("Founder request requires a valid X handle and non-empty description", () => {
  assert.throws(() => validateFounderRequest({ xUsername: "bad handle", description: "A valid request" }), /valid X username/);
  assert.throws(() => validateFounderRequest({ xUsername: "founder", description: "" }), /briefly why/);
});

test("IP fingerprints are stable per server secret and not raw addresses", () => {
  const fingerprint = fingerprintRequesterIp("203.0.113.10", "test-secret");
  assert.equal(fingerprint, fingerprintRequesterIp("203.0.113.10", "test-secret"));
  assert.notEqual(fingerprint, fingerprintRequesterIp("203.0.113.11", "test-secret"));
  assert.equal(fingerprint.includes("203.0.113.10"), false);
});
