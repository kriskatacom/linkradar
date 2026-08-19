export type SendEmailInput = {
    to: string;
    subject: string;
    html: string;
    text: string;
};

export type NamedRecipient = {
    name: string;
    email: string;
};

export type ActionEmailInput = NamedRecipient & {
    actionUrl: string;
};

export type NewLoginEmailInput = NamedRecipient & {
    time: string;
    ipAddress: string | null;
    userAgent: string | null;
};

export type Mailer = {
    sendEmail(input: SendEmailInput): Promise<void>;
    sendWelcomeEmail(input: NamedRecipient): Promise<void>;
    sendVerificationEmail(input: ActionEmailInput): Promise<void>;
    sendWelcomeAndVerificationEmail(input: ActionEmailInput): Promise<void>;
    sendPasswordResetEmail(input: ActionEmailInput): Promise<void>;
    sendPasswordChangedEmail(input: NamedRecipient): Promise<void>;
    sendNewLoginEmail(input: NewLoginEmailInput): Promise<void>;
};

export type MailTransport = {
    sendMail(options: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text: string;
    }): Promise<unknown>;
};
