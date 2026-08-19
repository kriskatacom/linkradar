import type {
    ActionEmailInput,
    Mailer,
    NamedRecipient,
    NewLoginEmailInput,
    SendEmailInput,
} from "../src/modules/mail/mail.types.js";

export class RecordingMailer implements Mailer {
    readonly emails: Array<{ kind: string; payload: unknown }> = [];
    shouldFail = false;

    last(kind: string): unknown {
        return [...this.emails].reverse().find((email) => email.kind === kind)?.payload;
    }

    private async record(kind: string, payload: unknown): Promise<void> {
        if (this.shouldFail) {
            throw new Error("Mail transport failed.");
        }

        this.emails.push({ kind, payload });
    }

    async sendEmail(input: SendEmailInput): Promise<void> {
        await this.record("sendEmail", input);
    }

    async sendWelcomeEmail(input: NamedRecipient): Promise<void> {
        await this.record("welcome", input);
    }

    async sendVerificationEmail(input: ActionEmailInput): Promise<void> {
        await this.record("verification", input);
    }

    async sendWelcomeAndVerificationEmail(input: ActionEmailInput): Promise<void> {
        await this.record("welcomeAndVerification", input);
    }

    async sendPasswordResetEmail(input: ActionEmailInput): Promise<void> {
        await this.record("passwordReset", input);
    }

    async sendPasswordChangedEmail(input: NamedRecipient): Promise<void> {
        await this.record("passwordChanged", input);
    }

    async sendNewLoginEmail(input: NewLoginEmailInput): Promise<void> {
        await this.record("newLogin", input);
    }
}

export function tokenFromActionUrl(url: string): string {
    return new URL(url).searchParams.get("token") ?? "";
}
