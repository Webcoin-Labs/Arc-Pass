import { Resend, type Attachment } from "resend";
import { render } from "@react-email/render";
import { logger } from "./logger";
import { configuration } from "./env";
import { ApplicationReceivedEmail } from "./email-templates/ApplicationReceivedEmail";
import { FounderApprovedEmail } from "./email-templates/FounderApprovedEmail";

// Resend has the `send.webcoinlabs.com` subdomain verified. Keep the public
// Webcoin Labs inbox as Reply-To while sending from the verified domain.
const FROM_ADDRESS = "Arc Pass <contact@send.webcoinlabs.com>";
const REPLY_TO_ADDRESS = "contact@webcoinlabs.com";
// These are attached inline by Resend rather than fetched by the recipient's
// email client. That prevents a misconfigured API APP_URL, image proxy, or
// remote-image privacy setting from leaving the transactional header blank.
const EMAIL_ASSET_ORIGIN = "https://arc.webcoinlabs.com";

export function inlineBrandAssets(): Attachment[] {
  return [
    {
      path: `${EMAIL_ASSET_ORIGIN}/brand/arc-pass-logo.png`,
      filename: "arc-pass-logo.png",
      contentType: "image/png",
      contentId: "arc-pass-logo",
    },
    {
      path: `${EMAIL_ASSET_ORIGIN}/brand/webcoin-mono-white.png`,
      filename: "webcoin-mono-white.png",
      contentType: "image/png",
      contentId: "webcoin-labs-logo",
    },
  ];
}

function resendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export interface ApplicationReceivedEmailInput {
  to: string;
  xUsername: string;
  description: string;
}

export interface FounderApprovedEmailInput {
  to: string;
  name: string;
  companyName: string;
}

/** Never throws — returns false when Resend isn't configured or the send fails. */
export async function sendApplicationReceivedEmail(input: ApplicationReceivedEmailInput): Promise<boolean> {
  const client = resendClient();
  if (!client) return false;
  try {
    const element = ApplicationReceivedEmail({ xUsername: input.xUsername, description: input.description });
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: "We've received your Founder Pass request",
      html,
      text,
      replyTo: REPLY_TO_ADDRESS,
      attachments: inlineBrandAssets(),
    });
    if (error) {
      logger.error({ error }, "Resend rejected Founder Pass application-received email");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send Founder Pass application-received email");
    return false;
  }
}

/** Never throws — returns false when Resend isn't configured or the send fails. */
export async function sendFounderApprovedEmail(input: FounderApprovedEmailInput): Promise<boolean> {
  const client = resendClient();
  if (!client) return false;
  try {
    const element = FounderApprovedEmail({ name: input.name, companyName: input.companyName, appUrl: configuration.appUrl });
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
    const { error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: "You're approved for an Arc Founder Pass",
      html,
      text,
      replyTo: REPLY_TO_ADDRESS,
      attachments: inlineBrandAssets(),
    });
    if (error) {
      logger.error({ error }, "Resend rejected Founder Pass approval email");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send Founder Pass approval email");
    return false;
  }
}
