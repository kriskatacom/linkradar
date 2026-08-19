export type EmailContent = {
    subject: string;
    html: string;
    text: string;
};

export function renderEmailLayout(input: {
    preview: string;
    heading: string;
    bodyHtml: string;
    bodyText: string;
    actionUrl?: string;
    actionLabel?: string;
}): EmailContent {
    const button = input.actionUrl
        ? `<p style="margin:24px 0;"><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">${escapeHtml(input.actionLabel ?? "Open LinkRadar")}</a></p>
<p style="color:#64748b;font-size:12px;word-break:break-all;">If the button does not work, copy this URL:<br>${escapeHtml(input.actionUrl)}</p>`
        : "";

    const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 16px;font-size:18px;font-weight:700;">LinkRadar</p>
                <h1 style="margin:0 0 16px;font-size:22px;">${escapeHtml(input.heading)}</h1>
                ${input.bodyHtml}
                ${button}
                <p style="margin:32px 0 0;color:#64748b;font-size:12px;">This message was sent by LinkRadar.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const textParts = [input.heading, "", input.bodyText];
    if (input.actionUrl) {
        textParts.push("", `${input.actionLabel ?? "Open LinkRadar"}: ${input.actionUrl}`);
    }
    textParts.push("", "This message was sent by LinkRadar.");

    return {
        subject: input.heading,
        html,
        text: textParts.join("\n"),
    };
}

export function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
