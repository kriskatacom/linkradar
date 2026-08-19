import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { generateRefreshToken, hashRefreshToken } from "../src/lib/tokens.js";
import { AuthError } from "../src/modules/auth/auth.errors.js";
import {
    EMAIL_VERIFICATION_REQUEST_MESSAGE,
    FORGOT_PASSWORD_MESSAGE,
    AuthService,
} from "../src/modules/auth/auth.service.js";
import { MemoryAuthRepository } from "./memory-auth.repository.js";
import { RecordingMailer, tokenFromActionUrl } from "./recording-mailer.js";

const context = {
    userAgent: "vitest",
    ipAddress: "127.0.0.1",
};

function expectAuthError(error: unknown, code: string, statusCode: number): void {
    expect(error).toBeInstanceOf(AuthError);
    const authError = error as AuthError;
    expect(authError.code).toBe(code);
    expect(authError.statusCode).toBe(statusCode);
}

describe("auth email flows", () => {
    it("registers a user and sends a hashed verification token", async () => {
        const repository = new MemoryAuthRepository();
        const mailer = new RecordingMailer();
        const service = new AuthService(repository, mailer);

        const result = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        const sent = mailer.last("welcomeAndVerification") as { actionUrl: string };
        const rawToken = tokenFromActionUrl(sent.actionUrl);
        const stored = [...repository.emailVerificationTokens.values()][0];

        expect(result.user.emailVerified).toBe(false);
        expect(mailer.emails).toHaveLength(1);
        expect(rawToken.length).toBeGreaterThan(20);
        expect(stored?.tokenHash).toBe(hashRefreshToken(rawToken));
        expect(stored?.tokenHash).not.toBe(rawToken);
        expect(JSON.stringify(stored)).not.toContain(rawToken);
    });

    it("still creates the user when registration email sending fails", async () => {
        const repository = new MemoryAuthRepository();
        const mailer = new RecordingMailer();
        mailer.shouldFail = true;
        const service = new AuthService(repository, mailer);

        const result = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        expect(result.user.email).toBe("user@example.com");
        expect(repository.users.size).toBe(1);
        expect([...repository.users.values()][0]?.email).toBe("user@example.com");
    });

    it("verifies a valid email token and rejects invalid, expired, and used tokens", async () => {
        const repository = new MemoryAuthRepository();
        const mailer = new RecordingMailer();
        const service = new AuthService(repository, mailer);

        await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        const sent = mailer.last("welcomeAndVerification") as { actionUrl: string };
        const rawToken = tokenFromActionUrl(sent.actionUrl);
        const verified = await service.verifyEmail(rawToken);

        expect(verified.emailVerified).toBe(true);

        try {
            await service.verifyEmail(rawToken);
            throw new Error("Expected used token to fail.");
        } catch (error) {
            expectAuthError(error, "TOKEN_ALREADY_USED", 400);
        }

        try {
            await service.verifyEmail("not-a-real-token");
            throw new Error("Expected invalid token to fail.");
        } catch (error) {
            expectAuthError(error, "INVALID_TOKEN", 400);
        }

        const expiredRaw = generateRefreshToken();
        await repository.createEmailVerificationToken({
            id: randomUUID(),
            userId: verified.id,
            tokenHash: hashRefreshToken(expiredRaw),
            expiresAt: new Date(Date.now() - 60_000),
            usedAt: null,
        });

        try {
            await service.verifyEmail(expiredRaw);
            throw new Error("Expected expired token to fail.");
        } catch (error) {
            expectAuthError(error, "TOKEN_EXPIRED", 400);
        }
    });

    it("returns the same forgot-password result for known and unknown emails", async () => {
        const repository = new MemoryAuthRepository();
        const mailer = new RecordingMailer();
        const service = new AuthService(repository, mailer);

        await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        mailer.emails.length = 0;

        await service.forgotPassword("user@example.com");
        await service.forgotPassword("missing@example.com");

        expect(mailer.emails).toHaveLength(1);
        expect(mailer.emails[0]?.kind).toBe("passwordReset");
    });

    it("resets a password with a valid token and rejects expired or used tokens", async () => {
        const repository = new MemoryAuthRepository();
        const mailer = new RecordingMailer();
        const service = new AuthService(repository, mailer);

        const registered = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        await service.forgotPassword("user@example.com");
        const resetMail = mailer.last("passwordReset") as { actionUrl: string };
        const resetToken = tokenFromActionUrl(resetMail.actionUrl);

        await service.resetPassword(resetToken, "NewStrongPassword123");

        const afterReset = await service.login(
            {
                email: "user@example.com",
                password: "NewStrongPassword123",
            },
            context,
        );
        expect(afterReset.user.email).toBe("user@example.com");
        expect(mailer.emails.some((email) => email.kind === "passwordChanged")).toBe(true);

        try {
            await service.login(
                {
                    email: "user@example.com",
                    password: "StrongPassword123",
                },
                context,
            );
            throw new Error("Expected old password to fail.");
        } catch (error) {
            expectAuthError(error, "INVALID_CREDENTIALS", 401);
        }

        try {
            await service.resetPassword(resetToken, "AnotherPassword123");
            throw new Error("Expected used reset token to fail.");
        } catch (error) {
            expectAuthError(error, "TOKEN_ALREADY_USED", 400);
        }

        const expiredRaw = generateRefreshToken();
        await repository.createPasswordResetToken({
            id: randomUUID(),
            userId: registered.user.id,
            tokenHash: hashRefreshToken(expiredRaw),
            expiresAt: new Date(Date.now() - 60_000),
            usedAt: null,
        });

        try {
            await service.resetPassword(expiredRaw, "AnotherPassword123");
            throw new Error("Expected expired reset token to fail.");
        } catch (error) {
            expectAuthError(error, "TOKEN_EXPIRED", 400);
        }
    });
});

describe("auth email routes", () => {
    it("returns a generic success for known and unknown forgot-password emails", async () => {
        const repository = new MemoryAuthRepository();
        const mailer = new RecordingMailer();
        const app = await buildApp({ repository, mailer });

        await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
        });

        const known = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: "user@example.com" },
        });
        const unknown = await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: "missing@example.com" },
        });

        expect(known.statusCode).toBe(200);
        expect(unknown.statusCode).toBe(200);
        expect(known.json().data.message).toBe(FORGOT_PASSWORD_MESSAGE);
        expect(unknown.json().data.message).toBe(FORGOT_PASSWORD_MESSAGE);
        expect(known.json()).toEqual(unknown.json());

        await app.close();
    });

    it("verifies email and resets password through HTTP endpoints", async () => {
        const repository = new MemoryAuthRepository();
        const mailer = new RecordingMailer();
        const app = await buildApp({ repository, mailer });

        const registered = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
        });

        expect(registered.json().data.user.emailVerified).toBe(false);

        const welcome = mailer.last("welcomeAndVerification") as { actionUrl: string };
        const verifyToken = tokenFromActionUrl(welcome.actionUrl);

        const verified = await app.inject({
            method: "POST",
            url: "/api/auth/email/verification/verify",
            payload: { token: verifyToken },
        });

        expect(verified.statusCode).toBe(200);
        expect(verified.json().data.user.emailVerified).toBe(true);
        expect(JSON.stringify(verified.json())).not.toContain(verifyToken);

        const reused = await app.inject({
            method: "POST",
            url: "/api/auth/email/verification/verify",
            payload: { token: verifyToken },
        });
        expect(reused.statusCode).toBe(400);
        expect(reused.json().error.code).toBe("TOKEN_ALREADY_USED");

        await app.inject({
            method: "POST",
            url: "/api/auth/forgot-password",
            payload: { email: "user@example.com" },
        });
        const resetMail = mailer.last("passwordReset") as { actionUrl: string };
        const resetToken = tokenFromActionUrl(resetMail.actionUrl);

        const reset = await app.inject({
            method: "POST",
            url: "/api/auth/reset-password",
            payload: { token: resetToken, password: "NewStrongPassword123" },
        });
        expect(reset.statusCode).toBe(200);

        const login = await app.inject({
            method: "POST",
            url: "/api/auth/login",
            payload: {
                email: "user@example.com",
                password: "NewStrongPassword123",
            },
        });
        expect(login.statusCode).toBe(200);

        const requestVerification = await app.inject({
            method: "POST",
            url: "/api/auth/email/verification/request",
            payload: { email: "user@example.com" },
        });
        expect(requestVerification.statusCode).toBe(200);
        expect(requestVerification.json().data.message).toBe(EMAIL_VERIFICATION_REQUEST_MESSAGE);

        await app.close();
    });
});
