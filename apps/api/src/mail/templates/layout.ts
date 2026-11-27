/** Payload that MailerService / Resend accept for one message. */
export type MailMessage = {
  subject: string;
  html: string;
  text: string;
};

/** Escape text that will be interpolated into HTML (body or attributes). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export type EmailLayoutOptions = {
  /** Optional preheader shown in inbox previews. */
  preheader?: string;
  /** Inner HTML (already escaped where needed). */
  bodyHtml: string;
  /** Public app URL shown in the footer. */
  appUrl: string;
};

/**
 * Email-safe shell: table layout, inline CSS, 600px max width.
 * No external fonts or remote images — clients block or break those often.
 */
export function renderEmailLayout({
  preheader,
  bodyHtml,
  appUrl,
}: EmailLayoutOptions): string {
  const safeAppUrl = escapeHtml(appUrl);
  const preheaderHtml = preheader
    ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Convocados</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${preheaderHtml}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;background-color:#f4f4f5;">
  <tr>
    <td align="center" style="padding:24px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;max-width:600px;width:100%;background-color:#ffffff;">
        <tr>
          <td style="padding:28px 32px 12px 32px;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.3;font-weight:bold;color:#14532d;">
            Convocados
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.55;color:#18181b;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e4e4e7;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#71717a;">
            Convocados · Organiza os teus jogos<br />
            <a href="${safeAppUrl}" style="color:#71717a;text-decoration:underline;">${safeAppUrl}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Primary CTA button — table + inline styles for Outlook/Gmail. */
export function renderButton(label: string, href: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:24px 0;">
  <tr>
    <td align="center" bgcolor="#16a34a" style="border-radius:6px;background-color:#16a34a;">
      <a href="${safeHref}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;line-height:1.25;color:#ffffff;text-decoration:none;border-radius:6px;">${safeLabel}</a>
    </td>
  </tr>
</table>`;
}
