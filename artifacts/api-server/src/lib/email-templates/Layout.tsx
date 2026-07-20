// Bulletproof table-based email layout, hand-built rather than pulled from
// @react-email/components (that package was deprecated by its maintainers
// mid-2026 — npm flags every recent version "no longer supported"). Still
// renders through the actively-maintained @react-email/render pipeline;
// this file just supplies the markup that package would otherwise wrap.
const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function Layout({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <title>Arc Pass</title>
        <style>{"@media (max-width:600px){.arc-email-container{width:100%!important}.arc-email-px{padding-left:20px!important;padding-right:20px!important}}"}</style>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: "#f4f5f7", fontFamily: FONT_STACK }}>
        <span style={{ display: "none", overflow: "hidden", lineHeight: "1px", opacity: 0, maxHeight: 0, maxWidth: 0 }}>{preview}</span>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ backgroundColor: "#f4f5f7" }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 16px" }}>
                <table
                  role="presentation"
                  className="arc-email-container"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={{ width: "600px", maxWidth: "100%", backgroundColor: "#ffffff", borderRadius: 16 }}
                >
                  <tbody>
                    <tr>
                      <td style={{ backgroundColor: "#1a1b20", borderRadius: "16px 16px 0 0", padding: "24px 32px" }}>
                        <img src="cid:arc-pass-logo" width={84} height={32} alt="Arc Pass" style={{ display: "block", height: 32, width: 84, border: 0 }} />
                        <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ marginTop: 10 }}>
                          <tbody>
                            <tr>
                              <td style={{ fontSize: 11, color: "#8fa0c9", paddingRight: 5, verticalAlign: "middle" }}>by</td>
                              <td style={{ verticalAlign: "middle" }}>
                                <img src="cid:webcoin-labs-logo" width={51} height={13} alt="Webcoin Labs" style={{ display: "block", height: 13, width: 51, border: 0 }} />
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td className="arc-email-px" style={{ padding: "32px", color: "#1a1b20" }}>
                        {children}
                      </td>
                    </tr>
                    <tr>
                      <td className="arc-email-px" style={{ padding: "20px 32px", borderTop: "1px solid #eceef1" }}>
                        <span style={{ color: "#8a8f98", fontSize: 12, lineHeight: "18px" }}>
                          Webcoin Labs · This is a transactional email about your Arc Pass request.
                          <br />
                          Questions? Reply to contact@webcoinlabs.com
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailButton({ href, children }: { href: string; children: React.ReactNode }) {
  // Table-wrapped button, not a padded <a> — Outlook's Word rendering engine
  // drops padding on anchors unreliably, but honors it on table cells.
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ marginTop: 24 }}>
      <tbody>
        <tr>
          <td style={{ borderRadius: 12, backgroundColor: "#178ce5" }}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", padding: "14px 28px", fontSize: 15, fontWeight: 600, color: "#ffffff", textDecoration: "none", borderRadius: 12 }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
