import { Layout } from "./Layout";

export interface ApplicationReceivedEmailProps {
  xUsername: string;
  description: string;
}

export function ApplicationReceivedEmail({ xUsername, description }: ApplicationReceivedEmailProps) {
  return (
    <Layout preview="We've received your Founder Pass request.">
      <p style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, lineHeight: "28px" }}>We've received your request</p>
      <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: "24px", color: "#3a3f47" }}>
        Thanks for applying for an Arc Founder Pass. Your request from <strong>@{xUsername}</strong> is now under review by the Webcoin Labs team.
      </p>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ margin: "20px 0", borderRadius: 12, backgroundColor: "#f7f8fa", border: "1px solid #eceef1" }}>
        <tbody>
          <tr>
            <td style={{ padding: "16px 20px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8a8f98" }}>What you submitted</p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: "22px", color: "#1a1b20", whiteSpace: "pre-wrap" }}>{description}</p>
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: "24px", color: "#3a3f47" }}>
        Founder Pass remains invite-only. If you're selected, you'll hear from us at this email address with next steps.
      </p>
      <p style={{ margin: "16px 0 0", fontSize: 15, lineHeight: "24px", color: "#3a3f47" }}>— The Webcoin Labs team</p>
    </Layout>
  );
}
