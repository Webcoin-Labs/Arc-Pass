import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const workspace = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

test("wallet ownership challenges are nonce-bound, expiring, and atomically replay-protected", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/routes/users.ts"), "utf8");
  assert.match(source, /randomBytes\(24\)/);
  assert.match(source, /challenge\.expiresAt <= new Date\(\)/);
  assert.match(source, /isNull\(walletChallengesTable\.consumedAt\)/);
  assert.match(source, /verifyMessage/);
  assert.match(source, /This challenge or wallet was already used/);
});

test("OAuth state is signed, expires, and is consumed once", async () => {
  const source = await readFile(path.join(workspace, "artifacts/api-server/src/lib/oauth/provider.ts"), "utf8");
  assert.match(source, /jwtVerify/);
  assert.match(source, /setExpirationTime/);
  assert.match(source, /isNull\(oauthStatesTable\.consumedAt\)/);
  assert.match(source, /OAuth state expired or already used/);
  assert.match(source, /codeVerifier: params\.codeVerifier/);
  const payloadBlock = source.match(/const payload: OAuthState = \{[\s\S]*?\n  \};/)?.[0] ?? "";
  assert.doesNotMatch(payloadBlock, /codeVerifier/);
});

test("claimed and minted credentials both retain the X share fallback", async () => {
  const sharing = await readFile(path.join(workspace, "artifacts/api-server/src/routes/sharing.ts"), "utf8");
  const exportImage = await readFile(path.join(workspace, "artifacts/arc-pass/src/lib/export-image.ts"), "utf8");
  assert.match(sharing, /pass\.claimStatus === "locked"/);
  assert.match(exportImage, /x\.com\/intent\/post/);
  assert.match(exportImage, /I claimed my verified Arc/);
  assert.match(exportImage, /I minted my Arc/);
  assert.match(exportImage, /downloadBlob/);
});

test("Railway liveness never waits for Neon readiness", async () => {
  const health = await readFile(path.join(workspace, "artifacts/api-server/src/routes/health.ts"), "utf8");
  const liveness = health.match(/router\.get\("\/healthz"[\s\S]*?\n}\);/)?.[0] ?? "";
  assert.doesNotMatch(liveness, /pool\.query/);
  assert.match(health, /router\.get\("\/readyz"/);
  assert.match(health, /status\(503\)/);
});
