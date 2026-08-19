import type { ActionEmailInput } from "../mail.types.js";
import { escapeHtml, renderEmailLayout } from "./layout.js";

export function verifyEmailTemplate(input: ActionEmailInput) {
    return {
        ...renderEmailLayout({
            preview: "Verify your LinkRadar email address.",
            heading: "Verify your email",
            bodyHtml: `<p>Hi ${escapeHtml(input.name)},</p><p>Please verify your email address to finish setting up your LinkRadar account. This link expires in 24 hours.</p>`,
            bodyText: `Hi ${input.name},\n\nPlease verify your email address to finish setting up your LinkRadar account. This link expires in 24 hours.`,
            actionUrl: input.actionUrl,
            actionLabel: "Verify email",
        }),
        subject: "Verify your LinkRadar email",
    };
}

export function welcomeAndVerificationEmail(input: ActionEmailInput) {
    return {
        ...renderEmailLayout({
            preview: "Welcome to LinkRadar. Please verify your email.",
            heading: "Welcome to LinkRadar",
            bodyHtml: `<p>Hi ${escapeHtml(input.name)},</p><p>Your account is ready. Verify your email address to finish setup. This link expires in 24 hours.</p>`,
            bodyText: `Hi ${input.name},\n\nYour account is ready. Verify your email address to finish setup. This link expires in 24 hours.`,
            actionUrl: input.actionUrl,
            actionLabel: "Verify email",
        }),
        subject: "Welcome to LinkRadar — verify your email",
    };
}
