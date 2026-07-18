import test from "node:test";
import assert from "node:assert/strict";
import {
  SUPPORT_ASSISTANT_MAX_MESSAGE_LENGTH,
  SupportAssistantValidationError,
  fingerprintSupportVisitor,
  supportWindowResetAt,
  validateSupportMessage,
} from "./support-assistant";

test("Support chat validates an ordinary support question", () => {
  assert.equal(validateSupportMessage({ message: "How does Builder Pass minting work?" }), "How does Builder Pass minting work?");
});

test("Support chat rejects blank and oversized messages", () => {
  assert.throws(() => validateSupportMessage({ message: "   " }), SupportAssistantValidationError);
  assert.throws(() => validateSupportMessage({ message: "x".repeat(SUPPORT_ASSISTANT_MAX_MESSAGE_LENGTH + 1) }), /characters/);
});

test("Support visitor fingerprint is stable and does not contain the raw IP", () => {
  const fingerprint = fingerprintSupportVisitor("203.0.113.10", "test-secret");
  assert.equal(fingerprint, fingerprintSupportVisitor("203.0.113.10", "test-secret"));
  assert.notEqual(fingerprint, fingerprintSupportVisitor("203.0.113.11", "test-secret"));
  assert.equal(fingerprint.includes("203.0.113.10"), false);
});

test("Support window expires 24 hours after its first response", () => {
  const start = new Date("2026-07-19T00:00:00.000Z");
  assert.equal(supportWindowResetAt(start).toISOString(), "2026-07-20T00:00:00.000Z");
});
