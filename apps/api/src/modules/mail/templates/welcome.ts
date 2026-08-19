import type { NamedRecipient } from "../mail.types.js";
import { escapeHtml, renderEmailLayout } from "./layout.js";

export function welcomeEmail(input: NamedRecipient & { appUrl: string }) {
    return {
        ...renderEmailLayout({
            preview: "Welcome to LinkRadar.",
            heading: "Welcome to LinkRadar",
            bodyHtml: `<p>Hi ${escapeHtml(input.name)},</p><p>Your account is ready. You can start monitoring websites for broken links and issues.</p>`,
            bodyText: `Hi ${input.name},\n\nYour account is ready. You can start monitoring websites for broken links and issues.`,
            actionUrl: input.appUrl,
            actionLabel: "Open LinkRadar",
        }),
        subject: "Welcome to LinkRadar",
    };
}
