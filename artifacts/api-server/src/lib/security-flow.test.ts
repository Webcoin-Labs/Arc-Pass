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

test("mint wallet flow requires an explicit destination, supports switching, verifies ownership, and requires Arc Testnet", async () => {
  const walletProvider = await readFile(path.join(workspace, "artifacts/arc-pass/src/lib/wallet-provider.tsx"), "utf8");
  const mintModal = await readFile(path.join(workspace, "artifacts/arc-pass/src/components/mint-modal.tsx"), "utf8");
  const walletManager = await readFile(path.join(workspace, "artifacts/arc-pass/src/components/wallet-manager.tsx"), "utf8");

  assert.match(walletProvider, /export const arcTestnet = defineChain/);
  assert.match(walletProvider, /reconnectOnMount=\{false\}/);
  assert.match(mintModal, /connectModalOpen/);
  assert.match(mintModal, /walletPickerRequested/);
  assert.match(mintModal, /disconnectAsync/);
  assert.match(mintModal, /Choose another wallet/);
  assert.match(mintModal, /Use this wallet/);
  assert.match(mintModal, /useCreateWalletChallenge/);
  assert.match(mintModal, /useVerifyWalletOwnership/);
  assert.match(mintModal, /Verify wallet ownership/);
  assert.match(mintModal, /modal=\{!walletPickerRequested && !connectModalOpen\}/);
  assert.match(mintModal, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(mintModal, /overflow-y-auto/);
  assert.match(mintModal, /switchChainAsync\(\{ chainId: arcTestnet\.id \}\)/);
  assert.match(mintModal, /Switch to Arc Testnet/);
  assert.match(walletManager, /switchChainAsync\(\{ chainId: arcTestnet\.id \}\)/);
  assert.match(walletManager, /Switch to Arc Testnet/);
});

test("Founder pass omits unavailable company-detail copy", async () => {
  const founderCard = await readFile(path.join(workspace, "artifacts/arc-pass/src/components/founder-pass-card.tsx"), "utf8");

  assert.doesNotMatch(founderCard, /Company details unavailable/);
  assert.match(founderCard, /data\.companyIndustry &&/);
  assert.match(founderCard, /data\.companyName && \(\s*<section/);
});

test("company logos are exported and rendered as true circular crops", async () => {
  const cropDialog = await readFile(path.join(workspace, "artifacts/arc-pass/src/components/image-crop-dialog.tsx"), "utf8");
  const companyLogo = await readFile(path.join(workspace, "artifacts/arc-pass/src/components/company-logo.tsx"), "utf8");

  assert.match(cropDialog, /ctx\.arc\(OUTPUT_SIZE \/ 2, OUTPUT_SIZE \/ 2, OUTPUT_SIZE \/ 2/);
  assert.match(cropDialog, /"image\/png"/);
  assert.match(companyLogo, /object-cover/);
  assert.doesNotMatch(companyLogo, /object-contain p-1\.5/);
});

test("Founder NFT metadata resolves to permanent generated R2 artwork", async () => {
  const sharing = await readFile(path.join(workspace, "artifacts/api-server/src/routes/sharing.ts"), "utf8");
  const artwork = await readFile(path.join(workspace, "artifacts/api-server/src/lib/founder-pass-artwork.ts"), "utf8").catch(() => "");

  assert.match(sharing, /ensureFounderPassArtwork/);
  assert.match(sharing, /image:\s*artworkUrl/);
  assert.doesNotMatch(sharing, /image:\s*`\$\{base\}\/api\/share\/\$\{type\}\/\$\{id\}\/image`/);
  assert.match(artwork, /passes\/founder/);
  assert.match(artwork, /persistGeneratedArtwork/);
  assert.match(artwork, /CARDHOLDER/);
  assert.match(artwork, /CREDENTIAL/);
  assert.match(artwork, /BLOCKCHAIN/);
  assert.match(artwork, /ISSUE DATE/);
  assert.match(artwork, /Verified by Webcoin Labs/);
  assert.match(artwork, /NON-TRANSFERABLE/);
  assert.match(artwork, /founder-card-arc-aurora-v3-runtime-fonts/);
  assert.match(sharing, /dynamicArtworkCacheControl = "no-store, max-age=0"/);
});

test("Railway installs runtime fonts for generated Founder Pass artwork", async () => {
  const railpack = await readFile(path.join(workspace, "railpack.json"), "utf8");
  const configuration = JSON.parse(railpack) as { deploy?: { aptPackages?: string[]; variables?: Record<string, string> } };

  assert.deepEqual(configuration.deploy?.aptPackages, ["fontconfig", "fonts-dejavu-core"]);
  assert.equal(configuration.deploy?.variables?.LANG, "en_US.UTF-8");
});

test("Premier Founder keeps its gold identity over an Arc blue, lavender, and pink background", async () => {
  const css = await readFile(path.join(workspace, "artifacts/arc-pass/src/index.css"), "utf8");
  const badge = await readFile(path.join(workspace, "artifacts/arc-pass/src/components/founder-pass-variant-badge.tsx"), "utf8");
  const premiumMaterial = css.match(/\.pass-material-founder-black\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";

  assert.match(premiumMaterial, /radial-gradient/);
  assert.match(premiumMaterial, /#123d9d/i);
  assert.match(premiumMaterial, /#e6b7d2/i);
  assert.doesNotMatch(css, /--material-founder-black-from:\s*28 45% 6%/);
  assert.match(badge, /#f6d38a/);
  assert.match(badge, /premierfounderpass\.webp/);
});
