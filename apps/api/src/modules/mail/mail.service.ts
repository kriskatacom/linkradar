import nodemailer from "nodemailer";

import { getApiEnv } from "../../config/env.js";
import type {
    ActionEmailInput,
    Mailer,
    MailTransport,
    NamedRecipient,
    NewLoginEmailInput,
    SendEmailInput,
} from "./mail.types.js";
import { newLoginEmail } from "./templates/new-login.js";
import { passwordChangedEmail } from "./templates/password-changed.js";
import { passwordResetEmail } from "./templates/password-reset.js";
import { verifyEmailTemplate, welcomeAndVerificationEmail } from "./templates/verify-email.js";
import { welcomeEmail } from "./templates/welcome.js";

export class SilentMailer implements Mailer {
    async sendEmail(): Promise<void> {}
    async sendWelcomeEmail(): Promise<void> {}
    async sendVerificationEmail(): Promise<void> {}
    async sendWelcomeAndVerificationEmail(): Promise<void> {}
    async sendPasswordResetEmail(): Promise<void> {}
    async sendPasswordChangedEmail(): Promise<void> {}
    async sendNewLoginEmail(): Promise<void> {}
}

export function createSmtpTransport(): MailTransport {
    const env = getApiEnv();

    return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpSecure,
        auth:
            env.smtpUser && env.smtpPassword
                ? { user: env.smtpUser, pass: env.smtpPassword }
                : undefined,
    });
}

export function defaultMailer(): Mailer {
    if (process.env.NODE_ENV === "test") {
        return new SilentMailer();
    }

    return new MailService();
}

export class MailService implements Mailer {
    constructor(private readonly transport: MailTransport = createSmtpTransport()) {}

    async sendEmail(input: SendEmailInput): Promise<void> {
        const env = getApiEnv();
        const from = `${env.mailFromName} <${env.mailFromAddress}>`;

        try {
            await this.transport.sendMail({
                from,
                to: input.to,
                subject: input.subject,
                html: input.html,
                text: input.text,
            });
        } catch (error) {
            console.error("[mail] Failed to send email", {
                to: input.to,
                subject: input.subject,
                error: error instanceof Error ? error.message : "Unknown error",
            });
            throw error;
        }
    }

    async sendWelcomeEmail(input: NamedRecipient): Promise<void> {
        const env = getApiEnv();
        const content = welcomeEmail({ ...input, appUrl: env.appUrl });
        await this.sendEmail({ to: input.email, ...content });
    }

    async sendVerificationEmail(input: ActionEmailInput): Promise<void> {
        const content = verifyEmailTemplate(input);
        await this.sendEmail({ to: input.email, ...content });
    }

    async sendWelcomeAndVerificationEmail(input: ActionEmailInput): Promise<void> {
        const content = welcomeAndVerificationEmail(input);
        await this.sendEmail({ to: input.email, ...content });
    }

    async sendPasswordResetEmail(input: ActionEmailInput): Promise<void> {
        const content = passwordResetEmail(input);
        await this.sendEmail({ to: input.email, ...content });
    }

    async sendPasswordChangedEmail(input: NamedRecipient): Promise<void> {
        const content = passwordChangedEmail(input);
        await this.sendEmail({ to: input.email, ...content });
    }

    async sendNewLoginEmail(input: NewLoginEmailInput): Promise<void> {
        const content = newLoginEmail(input);
        await this.sendEmail({ to: input.email, ...content });
    }
}
