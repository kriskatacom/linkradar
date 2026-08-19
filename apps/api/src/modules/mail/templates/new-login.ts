import type { NewLoginEmailInput } from "../mail.types.js";
import { escapeHtml, renderEmailLayout } from "./layout.js";

export function newLoginEmail(input: NewLoginEmailInput) {
    const ip = input.ipAddress ?? "Unknown IP";
    const userAgent = input.userAgent ?? "Unknown browser";

    return {
        ...renderEmailLayout({
            preview: "A new sign-in to your LinkRadar account.",
            heading: "New sign-in to your account",
            bodyHtml: `<p>Hi ${escapeHtml(input.name)},</p>
<p>Your LinkRadar account was just signed in with these details:</p>
<ul>
  <li>Time: ${escapeHtml(input.time)}</li>
  <li>IP address: ${escapeHtml(ip)}</li>
  <li>Browser: ${escapeHtml(userAgent)}</li>
</ul>
<p>If this was you, no action is needed. If not, reset your password.</p>`,
            bodyText: `Hi ${input.name},\n\nYour LinkRadar account was just signed in with these details:\nTime: ${input.time}\nIP address: ${ip}\nBrowser: ${userAgent}\n\nIf this was you, no action is needed. If not, reset your password.`,
        }),
        subject: "New sign-in to your LinkRadar account",
    };
}
