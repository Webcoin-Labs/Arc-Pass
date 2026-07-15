import { Router, type IRouter } from "express";
import { db, founderPassesTable, builderPassesTable, builderTiersTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { configuration } from "../lib/env";

const router: IRouter = Router();

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

async function shareRecord(type: string, id: number) {
  if (type === "founder") {
    const [pass] = await db.select().from(founderPassesTable).where(eq(founderPassesTable.id, id));
    if (!pass || pass.claimStatus !== "minted") return null;
    return { title: "Founder Pass", holder: pass.displayName || "Verified founder", detail: "Verified by Webcoin Labs" };
  }
  if (type === "builder") {
    const [pass] = await db.select().from(builderPassesTable).where(eq(builderPassesTable.id, id));
    if (!pass || pass.claimStatus !== "minted") return null;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pass.userId));
    const [tier] = pass.currentTierId ? await db.select().from(builderTiersTable).where(eq(builderTiersTable.id, pass.currentTierId)) : [null];
    return { title: "Onchain Builder Pass", holder: user?.displayName || "Verified builder", detail: `${tier?.name || "Verified"} tier · Webcoin Labs` };
  }
  return null;
}

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
