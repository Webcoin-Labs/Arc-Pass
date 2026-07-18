import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import { randomBytes } from "crypto";
import { db, founderPassesTable, founderTiersTable, builderPassesTable, builderTiersTable, usersTable, xShareDraftsTable } from "@workspace/db";
import { and, eq, lt, ne } from "drizzle-orm";
import { configuration } from "../lib/env";
import { requireAuth, type AuthedRequest } from "../lib/auth";
import { createPkcePair, signOAuthState } from "../lib/oauth/provider";
import { buildXAuthorizeUrl, isXOAuthConfigured } from "../lib/oauth/x";

const router: IRouter = Router();
const directShareUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
const DIRECT_SHARE_TTL_MS = 10 * 60 * 1000;
const X_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const acceptDirectShareImage: RequestHandler = (req, res, next) => {
  directShareUpload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    const tooLarge = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge
        ? "The pass image is larger than the 5 MB direct-sharing limit. Download it and use the X Web Intent fallback."
        : "The pass image could not be accepted. Download it and use the X Web Intent fallback.",
    });
  });
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

router.post("/share/x/direct", requireAuth, acceptDirectShareImage, async (req, res): Promise<void> => {
  if (!isXOAuthConfigured()) { res.status(503).json({ error: "Direct X posting is unavailable. Use the download and Web Intent fallback." }); return; }
  const user = (req as AuthedRequest).user;
  if (!user.xUserId) { res.status(409).json({ error: "Connect and verify X before authorizing direct posting. Use the download fallback in the meantime." }); return; }
  const passType = req.body?.passType;
  const passId = Number(req.body?.passId);
  const minted = req.body?.minted === "true";
  const image = req.file;
  if ((passType !== "founder" && passType !== "builder") || !Number.isSafeInteger(passId) || !image || !X_IMAGE_TYPES.has(image.mimetype)) {
    res.status(400).json({ error: "A valid claimed pass image is required." });
    return;
  }

  const owned = passType === "founder"
    ? (await db.select({ claimStatus: founderPassesTable.claimStatus }).from(founderPassesTable).where(and(eq(founderPassesTable.id, passId), eq(founderPassesTable.userId, user.id), ne(founderPassesTable.claimStatus, "locked"))).limit(1))[0]
    : (await db.select({ claimStatus: builderPassesTable.claimStatus }).from(builderPassesTable).where(and(eq(builderPassesTable.id, passId), eq(builderPassesTable.userId, user.id), ne(builderPassesTable.claimStatus, "locked"))).limit(1))[0];
  if (!owned) { res.status(404).json({ error: "Claim this pass before sharing it." }); return; }

  const actualMinted = owned.claimStatus === "minted";
  if (minted !== actualMinted) { res.status(409).json({ error: "Refresh the pass before sharing its latest state." }); return; }

  const returnToInput = typeof req.body?.returnTo === "string" ? req.body.returnTo : "/dashboard";
  const returnTo = returnToInput.startsWith("/") && !returnToInput.startsWith("//") ? returnToInput : "/dashboard";
  const shareUrl = `${configuration.appUrl.replace(/\/$/, "")}/api/share/${passType}/${passId}`;
  const credentialName = passType === "founder" ? "Founder" : "Builder";
  const postText = `${actualMinted ? `I minted my Arc ${credentialName} Pass onchain.` : `I claimed my verified Arc ${credentialName} Pass.`}\n${shareUrl}`;
  const draftId = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + DIRECT_SHARE_TTL_MS);
  await db.transaction(async (tx) => {
    await tx.delete(xShareDraftsTable).where(lt(xShareDraftsTable.expiresAt, new Date()));
    await tx.insert(xShareDraftsTable).values({ id: draftId, userId: user.id, passType, passId, mediaType: image.mimetype, mediaBase64: image.buffer.toString("base64"), postText, returnTo, expiresAt });
  });

  const { verifier, challenge } = createPkcePair();
  const state = await signOAuthState({ intent: "share", linkUserId: user.id, returnTo, codeVerifier: verifier, shareDraftId: draftId });
  res.status(201).json({ authorizationUrl: buildXAuthorizeUrl(state, challenge, { posting: true }) });
});

async function shareRecord(type: string, id: number) {
  if (type === "founder") {
    const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, id));
    if (!pass || pass.claimStatus === "locked") return null;
    return { title: "Founder Pass", holder: pass.displayName || "Verified founder", detail: pass.claimStatus === "minted" ? "Minted on Arc · Webcoin Labs" : "Claimed to Arc Pass inventory · Webcoin Labs" };
  }
  if (type === "builder") {
    const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, id));
    if (!pass || pass.claimStatus === "locked") return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pass.userId));
    const [tier] = pass.currentTierId ? await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, pass.currentTierId)) : [null];
    return { title: "Onchain Builder Pass", holder: user?.displayName || "Verified builder", detail: pass.claimStatus === "minted" ? `${tier?.name || "Verified"} tier · minted on Arc` : `${tier?.name || "Verified"} tier · claimed to inventory` };
  }
  return null;
}

async function metadataRecord(type: string, id: number) {
  if (type === "founder") {
    const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, id));
    if (!pass || pass.claimStatus !== "minted") return null;
    const [tier] = pass.founderTierId ? await db.select().from(founderTiersTable).where(eq(founderTiersTable.id, pass.founderTierId)) : [null];
    return {
      name: `${pass.displayName || "Verified founder"} · Arc Founder Pass`,
      description: "A permanent, non-transferable Founder credential issued by Webcoin Labs.",
      attributes: [
        { trait_type: "Credential", value: "Founder Pass" },
        { trait_type: "Founder type", value: pass.variant === "premium_black" ? "Premium Founder" : "Normal Founder" },
        ...(tier ? [{ trait_type: "Founder tier", value: tier.name }] : []),
        ...(pass.network ? [{ trait_type: "Network", value: pass.network }] : []),
        { trait_type: "Transferable", value: "No" },
      ],
    };
  }

  if (type === "builder") {
    const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, id));
    if (!pass || pass.claimStatus !== "minted") return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pass.userId));
    const [tier] = pass.currentTierId ? await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, pass.currentTierId)) : [null];
    return {
      name: `${user?.displayName || "Verified builder"} · Arc Onchain Builder Pass`,
      description: "A permanent, non-transferable Onchain Builder credential issued by Webcoin Labs.",
      attributes: [
        { trait_type: "Credential", value: "Onchain Builder Pass" },
        ...(tier ? [{ trait_type: "Builder tier", value: tier.name }] : []),
        ...(pass.network ? [{ trait_type: "Network", value: pass.network }] : []),
        { trait_type: "Transferable", value: "No" },
      ],
    };
  }

  return null;
}

// ERC-721 metadata endpoint. The contract stores this exact URL at mint time.
// It is intentionally public and only resolves already-minted credentials.
router.get("/metadata/:type/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const type = String(req.params.type);
  const record = Number.isSafeInteger(id) ? await metadataRecord(type, id) : null;
  if (!record) { res.sendStatus(404); return; }

  const base = configuration.appUrl.replace(/\/$/, "");
  res
    .type("json")
    .set("Cache-Control", "public, max-age=300")
    .json({
      ...record,
      image: `${base}/api/share/${type}/${id}/image`,
      external_url: `${base}/pass/${type}/${id}`,
    });
});

router.get("/share/:type/:id/image", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const record = Number.isSafeInteger(id) ? await shareRecord(String(req.params.type), id) : null;
  if (!record) { res.sendStatus(404); return; }
  const title = escapeHtml(record.title);
  const holder = escapeHtml(record.holder);
  const detail = escapeHtml(record.detail);
  res.type("image/svg+xml").set("Cache-Control", "public, max-age=300").send(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#10182a"/><stop offset="1" stop-color="#25204a"/></linearGradient><radialGradient id="r"><stop stop-color="#7657ff" stop-opacity=".38"/><stop offset="1" stop-color="#7657ff" stop-opacity="0"/></radialGradient></defs><rect width="1200" height="630" rx="0" fill="url(#g)"/><circle cx="980" cy="90" r="410" fill="url(#r)"/><text x="72" y="100" fill="#a8b0c4" font-family="Inter,Arial" font-size="24">ARC PASS · POWERED BY WEBCOIN LABS</text><text x="72" y="285" fill="white" font-family="Inter,Arial" font-weight="700" font-size="70">${title}</text><text x="72" y="382" fill="#dce1ee" font-family="Inter,Arial" font-size="44">${holder}</text><text x="72" y="472" fill="#a8b0c4" font-family="Inter,Arial" font-size="28">${detail}</text><rect x="72" y="530" width="1056" height="2" fill="#ffffff" opacity=".12"/></svg>`);
});

router.get("/share/:type/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const type = String(req.params.type);
  const record = Number.isSafeInteger(id) ? await shareRecord(type, id) : null;
  if (!record) { res.sendStatus(404); return; }
  const base = configuration.appUrl.replace(/\/$/, "");
  const canonical = `${base}/api/share/${type}/${id}`;
  const image = `${canonical}/image`;
  const target = `${base}/pass/${type}/${id}`;
  const title = `${record.holder} · ${record.title}`;
  res.type("html").set("Cache-Control", "public, max-age=300").send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><meta property="og:type" content="website"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(record.detail)}"><meta property="og:url" content="${escapeHtml(canonical)}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:image" content="${escapeHtml(image)}"><meta http-equiv="refresh" content="0;url=${escapeHtml(target)}"></head><body><p><a href="${escapeHtml(target)}">View this Arc Pass</a></p></body></html>`);
});

export default router;
