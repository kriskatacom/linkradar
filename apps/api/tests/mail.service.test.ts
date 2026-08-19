import { describe, expect, it, vi } from "vitest";

import { getApiEnv } from "../src/config/env.js";
import { MailService } from "../src/modules/mail/mail.service.js";
import type { MailTransport } from "../src/modules/mail/mail.types.js";

describe("mail service", () => {
    it("loads SMTP configuration", () => {
        const env = getApiEnv();

        expect(env.smtpHost.length).toBeGreaterThan(0);
        expect(env.smtpPort).toBeGreaterThan(0);
        expect(typeof env.smtpSecure).toBe("boolean");
        expect(env.mailFromName.length).toBeGreaterThan(0);
        expect(env.mailFromAddress).toContain("@");
        expect(env.appUrl.length).toBeGreaterThan(0);
    });

    it("sends email through the configured transport", async () => {
        const sendMail = vi.fn().mockResolvedValue({ messageId: "test-message" });
        const transport: MailTransport = { sendMail };
        const mailer = new MailService(transport);

        await mailer.sendEmail({
            to: "user@example.com",
            subject: "Hello",
            html: "<p>Hello</p>",
            text: "Hello",
        });

        expect(sendMail).toHaveBeenCalledTimes(1);
        expect(sendMail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "user@example.com",
                subject: "Hello",
                html: "<p>Hello</p>",
                text: "Hello",
                from: expect.stringContaining(getApiEnv().mailFromAddress),
            }),
        );
    });
});
