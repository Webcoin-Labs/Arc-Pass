import test from "node:test";
import assert from "node:assert/strict";
import { render } from "@react-email/render";
import { inlineBrandAssets, sendApplicationReceivedEmail, sendFounderApprovedEmail } from "./email";
import { ApplicationReceivedEmail } from "./email-templates/ApplicationReceivedEmail";
import { FounderApprovedEmail } from "./email-templates/FounderApprovedEmail";

test("email sending no-ops without throwing when RESEND_API_KEY is unset", async () => {
  delete process.env.RESEND_API_KEY;
  const receivedResult = await sendApplicationReceivedEmail({ to: "founder@example.com", xUsername: "founder", description: "Building on Arc." });
  assert.equal(receivedResult, false);
  const approvedResult = await sendFounderApprovedEmail({ to: "founder@example.com", name: "Rishu", companyName: "Acme Labs" });
  assert.equal(approvedResult, false);
});

function stripHtmlComments(html: string): string {
  // React's static-markup renderer inserts <!-- --> hydration-boundary
  // comments between adjacent JSX text/expression children; invisible when
  // actually rendered, but they break naive substring/regex assertions.
  return html.replace(/<!--.*?-->/g, "");
}

test("application-received template renders and HTML-escapes free-text input", async () => {
  const html = await render(ApplicationReceivedEmail({ xUsername: "founder", description: "<script>alert(1)</script> & \"quotes\"" }));
  const text = stripHtmlComments(html);
  assert.match(text, /received your request/);
  assert.match(text, /@founder/);
  assert.equal(html.includes("<script>alert(1)</script>"), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /cid:arc-pass-logo/);
  assert.match(html, /cid:webcoin-labs-logo/);
});

test("transactional emails embed the two verified brand assets as inline Resend attachments", () => {
  assert.deepEqual(inlineBrandAssets(), [
    {
      path: "https://arc.webcoinlabs.com/brand/arc-pass-logo.png",
      filename: "arc-pass-logo.png",
      contentType: "image/png",
      contentId: "arc-pass-logo",
    },
    {
      path: "https://arc.webcoinlabs.com/brand/webcoin-mono-white.png",
      filename: "webcoin-mono-white.png",
      contentType: "image/png",
      contentId: "webcoin-labs-logo",
    },
  ]);
});

test("transactional emails use Resend's verified sender domain", async () => {
  const emailSource = await import("node:fs/promises").then((fs) => fs.readFile(new URL("./email.ts", import.meta.url), "utf8"));
  assert.match(emailSource, /Arc Pass <contact@send\.webcoinlabs\.com>/);
  assert.match(emailSource, /replyTo: REPLY_TO_ADDRESS/);
});

test("founder-approved template renders personalized content and a claim link", async () => {
  const html = await render(FounderApprovedEmail({ name: "Rishu", companyName: "Acme Labs", appUrl: "https://arc.webcoinlabs.com" }));
  const text = stripHtmlComments(html);
  assert.match(text, /Congratulations, Rishu/);
  assert.match(text, /Acme Labs/);
  assert.match(text, /https:\/\/arc\.webcoinlabs\.com/);
});
