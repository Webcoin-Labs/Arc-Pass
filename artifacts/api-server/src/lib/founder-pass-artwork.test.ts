import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const rendererModule = "./founder-pass-artwork";

async function loadRenderer() {
  try {
    return await import(rendererModule) as {
      buildFounderPassSvg: (data: Record<string, unknown>) => string;
      renderFounderPassArtwork: (data: Record<string, unknown>) => Promise<Buffer>;
      loadFounderPassBrandAssets?: () => Promise<{
        arcPassLogoDataUrl: string;
        arcNetworkLogoDataUrl: string;
        premierEmblemDataUrl: string;
        emergingEmblemDataUrl: string;
      }>;
    };
  } catch {
    assert.fail("Founder artwork renderer is missing");
  }
}

const premierFounder = {
  id: 1,
  variant: "premium_black",
  displayName: "Rishu",
  username: "solrishu",
  founderTitle: "Founder",
  companyName: "Webcoin Labs",
  companyIndustry: "Identity Infrastructure",
  tierName: "Premier Founder",
  passNumber: 1,
  network: "arc",
  issuedAt: new Date("2026-07-20T00:00:00.000Z"),
  claimStatus: "minted",
};

test("server renderer builds the complete Premier Founder card", async () => {
  const renderer = await loadRenderer();
  const svg = renderer.buildFounderPassSvg(premierFounder);

  assert.match(svg, /Arc Pass/);
  assert.match(svg, /FOUNDER PASS/);
  assert.match(svg, /PREMIER FOUNDER/);
  assert.match(svg, /CARDHOLDER/);
  assert.match(svg, /Rishu/);
  assert.match(svg, /Webcoin Labs/);
  assert.match(svg, /ARC-FND-2026-0001/);
  assert.match(svg, /NON-TRANSFERABLE/);
  assert.match(svg, /#123d9d/i);
  assert.match(svg, /#e6b7d2/i);
  assert.match(svg, /DejaVu Sans/);
  assert.match(svg, /DejaVu Sans Mono/);
});

test("server renderer outputs NFT-ready WebP artwork", async () => {
  const renderer = await loadRenderer();
  const image = await renderer.renderFounderPassArtwork(premierFounder);
  const metadata = await sharp(image).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 845);
});

test("server renderer uses the same Arc Pass and Arc network logos as the dashboard", async () => {
  const renderer = await loadRenderer();
  assert.equal(typeof renderer.loadFounderPassBrandAssets, "function", "exact dashboard logo loader is required");

  const assets = await renderer.loadFounderPassBrandAssets!();
  assert.match(assets.arcPassLogoDataUrl, /^data:image\/png;base64,/);
  assert.match(assets.arcNetworkLogoDataUrl, /^data:image\/png;base64,/);
  assert.match(assets.premierEmblemDataUrl, /^data:image\/png;base64,/);

  const svg = renderer.buildFounderPassSvg({ ...premierFounder, ...assets });
  assert.match(svg, /aria-label="Arc Pass logo"[\s\S]*?<image/);
  assert.match(svg, /aria-label="Arc network"[\s\S]*?<image/);
  assert.doesNotMatch(svg, /M5 43C7 17 24 2/);
  assert.doesNotMatch(svg, /M395 586c2-19/);
});
