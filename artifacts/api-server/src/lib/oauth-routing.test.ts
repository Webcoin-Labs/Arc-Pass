import assert from "node:assert/strict";
import test from "node:test";
import {
  appendReturnToQuery,
  expectedIdentityMatches,
  normalizeExpectedIdentity,
  sanitizeReturnTo,
} from "./oauth/routing";

test("OAuth return routes stay local and preserve their existing query", () => {
  assert.equal(sanitizeReturnTo("/claim/builder?step=identity"), "/claim/builder?step=identity");
  assert.equal(sanitizeReturnTo("https://attacker.example/path"), "/dashboard");
  assert.equal(sanitizeReturnTo("//attacker.example/path"), "/dashboard");
  assert.equal(sanitizeReturnTo("/\\attacker.example/path"), "/dashboard");
  assert.equal(
    appendReturnToQuery("/claim/builder?step=identity", "authError", "identity_mismatch"),
    "/claim/builder?step=identity&authError=identity_mismatch",
  );
});

test("X identity expectation strips @, lowercases, and rejects a different OAuth account", () => {
  const expected = normalizeExpectedIdentity("x", "@SolRishu");
  assert.deepEqual(expected, { provider: "x", username: "solrishu", discriminator: null });
  assert.equal(expectedIdentityMatches(expected, { providerUserId: "1", username: "SolRishu", displayName: "Rishu", avatarUrl: null }), true);
  assert.equal(expectedIdentityMatches(expected, { providerUserId: "2", username: "someone_else", displayName: "Other", avatarUrl: null }), false);
});

test("Discord expectation accepts modern handles and binds a supplied legacy discriminator", () => {
  const modern = normalizeExpectedIdentity("discord", "Builder.Name");
  assert.equal(expectedIdentityMatches(modern, { providerUserId: "1", username: "builder.name", displayName: "Builder", avatarUrl: null }), true);

  const legacy = normalizeExpectedIdentity("discord", "Builder", "1234");
  assert.equal(expectedIdentityMatches(legacy, { providerUserId: "2", username: "builder", discriminator: "1234", displayName: "Builder", avatarUrl: null }), true);
  assert.equal(expectedIdentityMatches(legacy, { providerUserId: "3", username: "builder", discriminator: "9999", displayName: "Builder", avatarUrl: null }), false);
});
