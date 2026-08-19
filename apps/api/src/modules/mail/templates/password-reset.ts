import type { ActionEmailInput } from "../mail.types.js";
import { escapeHtml, renderEmailLayout } from "./layout.js";

export function passwordResetEmail(input: ActionEmailInput) {
    return {
        ...renderEmailLayout({
            preview: "Reset your LinkRadar password.",
            heading: "Reset your password",
            bodyHtml: `<p>Hi ${escapeHtml(input.name)},</p><p>We received a request to reset your LinkRadar password. This link expires in 1 hour. If you did not request this, you can ignore this email.</p>`,
            bodyText: `Hi ${input.name},\n\nWe received a request to reset your LinkRadar password. This link expires in 1 hour. If you did not request this, you can ignore this email.`,
            actionUrl: input.actionUrl,
            actionLabel: "Reset password",
        }),
        subject: "Reset your LinkRadar password",
    };
}
