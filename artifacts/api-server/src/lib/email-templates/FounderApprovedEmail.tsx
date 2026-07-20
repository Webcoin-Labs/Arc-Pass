import { Layout, EmailButton } from "./Layout";

export interface FounderApprovedEmailProps {
  name: string;
  companyName: string;
  appUrl: string;
}

export function FounderApprovedEmail({ name, companyName, appUrl }: FounderApprovedEmailProps) {
  return (
    <Layout preview="You're officially eligible to claim your Arc Founder Pass.">
      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#178ce5" }}>Founder Pass</p>
      <p style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, lineHeight: "28px" }}>Congratulations, {name} 🎉</p>
      <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: "24px", color: "#3a3f47" }}>
        You're officially eligible to claim your Arc Founder Pass for <strong>{companyName}</strong>. This is a permanent, non-transferable credential that recognizes you as a verified founder in the Arc ecosystem.
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 15, lineHeight: "24px", color: "#3a3f47" }}>
        Sign in with the same account you applied with to claim it — it only takes a minute.
      </p>
      <EmailButton href={appUrl}>Claim your Founder Pass</EmailButton>
      <p style={{ margin: "28px 0 0", fontSize: 15, lineHeight: "24px", color: "#3a3f47" }}>Welcome aboard.</p>
      <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: "#3a3f47" }}>— The Webcoin Labs team</p>
    </Layout>
  );
}
