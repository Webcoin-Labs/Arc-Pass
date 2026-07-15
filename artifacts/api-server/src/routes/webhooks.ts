import { Router, type IRouter } from "express";
import { createHmac, timingSafeEqual, createHash } from "crypto";
import { db, founderApplicationsTable } from "@workspace/db";

const router: IRouter = Router();

function secureEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

router.post("/webhooks/typeform/founder-application", async (req, res): Promise<void> => {
  const secret = process.env.TYPEFORM_WEBHOOK_SECRET;
  const formId = process.env.TYPEFORM_FORM_ID;
  if (!secret || !formId) { res.status(503).json({ error: "Founder application ingestion is not configured." }); return; }
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;
  const received = req.header("typeform-signature") || "";
  if (!rawBody) { res.status(400).json({ error: "Missing signed payload." }); return; }
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("base64")}`;
  if (!secureEqual(received, expected)) { res.status(401).json({ error: "Invalid webhook signature." }); return; }

  const response = req.body?.form_response;
  if (!response || response.form_id !== formId || typeof response.token !== "string") { res.status(400).json({ error: "Unexpected Typeform payload." }); return; }
  const values = new Map<string, string>();
  for (const answer of Array.isArray(response.answers) ? response.answers : []) {
    const key = answer?.field?.ref;
    const value = answer?.text ?? answer?.email ?? answer?.url ?? answer?.choice?.label;
    if (typeof key === "string" && typeof value === "string") values.set(key, value);
  }

  await db.insert(founderApplicationsTable).values({
    source: "typeform",
    typeformResponseId: response.token,
    fullName: values.get("full_name") || "Typeform applicant",
    workEmail: values.get("work_email") || null,
    personalEmail: values.get("personal_email") || null,
    xUsername: values.get("x_username") || null,
    discordUsername: values.get("discord_username") || null,
    companyName: values.get("company_name") || null,
    companyWebsite: values.get("company_website") || null,
    founderRole: values.get("founder_role") || null,
    companyCategory: values.get("company_category") || null,
    startupStage: values.get("startup_stage") || null,
    description: values.get("description") || null,
    status: "under_review",
    submittedAt: response.submitted_at ? new Date(response.submitted_at) : new Date(),
    rawExternalPayloadReference: { sha256: createHash("sha256").update(rawBody).digest("hex") },
  }).onConflictDoNothing({ target: founderApplicationsTable.typeformResponseId });
  res.sendStatus(204);
});

export default router;
