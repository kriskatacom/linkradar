import { describe, expect, it } from "vitest";

import { AuthError } from "../src/modules/auth/auth.errors.js";
import { SocialAuthService } from "../src/modules/auth/social/social-auth.service.js";
import { DuplicateSocialIdentityError } from "../src/modules/auth/social/social-auth.repository.js";
import type { SocialProfile } from "../src/modules/auth/social/social-auth.types.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { MemoryAuthRepository } from "./memory-auth.repository.js";

const context = {
    userAgent: "vitest",
    ipAddress: "127.0.0.1",
};

const googleProfile: SocialProfile = {
    provider: "google",
    providerUserId: "google-user-1",
    email: "social@example.com",
    name: "Social User",
    emailVerified: true,
};

function expectAuthError(error: unknown, code: string, statusCode: number): void {
    expect(error).toBeInstanceOf(AuthError);
    const authError = error as AuthError;
    expect(authError.code).toBe(code);
    expect(authError.statusCode).toBe(statusCode);
}

function createSocialService(repository = new MemoryAuthRepository()) {
    const authService = new AuthService(repository);
    return {
        repository,
        authService,
        socialService: new SocialAuthService(repository, repository, authService),
    };
}

describe("SocialAuthService", () => {
    it("creates a new social user and session", async () => {
        const { repository, socialService } = createSocialService();

        const result = await socialService.loginWithProfile(googleProfile, context);

        expect(result.user.email).toBe("social@example.com");
        expect(result.user.emailVerified).toBe(true);
        expect(repository.users.size).toBe(1);
        expect(repository.socialAccounts.size).toBe(1);
        expect(repository.sessions.size).toBe(1);
        expect([...repository.users.values()][0]?.passwordHash).toBeNull();
    });

    it("logs in an existing social account", async () => {
        const { repository, socialService } = createSocialService();
        await socialService.loginWithProfile(googleProfile, context);

        const second = await socialService.loginWithProfile(googleProfile, context);

        expect(second.user.email).toBe("social@example.com");
        expect(repository.users.size).toBe(1);
        expect(repository.socialAccounts.size).toBe(1);
        expect(repository.sessions.size).toBe(2);
    });

    it("denies a deleted social user", async () => {
        const { repository, socialService } = createSocialService();
        const first = await socialService.loginWithProfile(googleProfile, context);
        const user = repository.users.get(first.user.id);
        if (user) {
            repository.users.set(user.id, { ...user, deletedAt: new Date() });
        }

        try {
            await socialService.loginWithProfile(googleProfile, context);
            throw new Error("Expected social login to fail");
        } catch (error) {
            expectAuthError(error, "UNAUTHENTICATED", 401);
        }
    });

    it("denies an inactive social user", async () => {
        const { repository, socialService } = createSocialService();
        const first = await socialService.loginWithProfile(googleProfile, context);
        const user = repository.users.get(first.user.id);
        if (user) {
            repository.users.set(user.id, { ...user, isActive: false });
        }

        try {
            await socialService.loginWithProfile(googleProfile, context);
            throw new Error("Expected social login to fail");
        } catch (error) {
            expectAuthError(error, "ACCOUNT_DISABLED", 403);
        }
    });

    it("prevents a duplicate provider identity", async () => {
        const { repository, socialService } = createSocialService();
        await socialService.loginWithProfile(googleProfile, context);

        await expect(
            repository.createUserAndSocialAccount(
                {
                    id: "another-user",
                    name: "Other",
                    email: "other@example.com",
                    passwordHash: null,
                    emailVerifiedAt: null,
                    isActive: true,
                    deletedAt: null,
                },
                {
                    id: "another-social",
                    userId: "another-user",
                    provider: "google",
                    providerUserId: "google-user-1",
                    providerEmail: "other@example.com",
                },
            ),
        ).rejects.toBeInstanceOf(DuplicateSocialIdentityError);
    });

    it("requires explicit linking when the email already exists", async () => {
        const { repository, socialService, authService } = createSocialService();
        await authService.register(
            {
                name: "Kristian",
                email: "social@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        try {
            await socialService.loginWithProfile(googleProfile, context);
            throw new Error("Expected social login to fail");
        } catch (error) {
            expectAuthError(error, "SOCIAL_ACCOUNT_LINK_REQUIRED", 409);
        }

        expect(repository.socialAccounts.size).toBe(0);
    });

    it("handles a missing email safely", async () => {
        const { socialService } = createSocialService();

        try {
            await socialService.loginWithProfile(
                {
                    ...googleProfile,
                    provider: "github",
                    email: null,
                },
                context,
            );
            throw new Error("Expected social login to fail");
        } catch (error) {
            expectAuthError(error, "SOCIAL_EMAIL_REQUIRED", 400);
        }
    });
});
