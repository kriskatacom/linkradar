import type { NamedRecipient } from "../mail.types.js";
import { escapeHtml, renderEmailLayout } from "./layout.js";

export function passwordChangedEmail(input: NamedRecipient) {
    return {
        ...renderEmailLayout({
            preview: "Your LinkRadar password was changed.",
            heading: "Your password was changed",
            bodyHtml: `<p>Hi ${escapeHtml(input.name)},</p><p>The password for your LinkRadar account was just changed. If you did not do this, reset your password immediately and contact support.</p>`,
            bodyText: `Hi ${input.name},\n\nThe password for your LinkRadar account was just changed. If you did not do this, reset your password immediately and contact support.`,
        }),
        subject: "Your LinkRadar password was changed",
    };
}
