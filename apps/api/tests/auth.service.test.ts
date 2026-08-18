import { describe, expect, it } from "vitest";

import { hashRefreshToken } from "../src/lib/tokens.js";
import { AuthError } from "../src/modules/auth/auth.errors.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import type { AuthSessionRow, UserRow } from "../src/modules/auth/auth.types.js";
import { MemoryAuthRepository } from "./memory-auth.repository.js";

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

async function seedUser(
    repository: MemoryAuthRepository,
    overrides: Partial<UserRow> = {},
): Promise<UserRow> {
    const { hashPassword } = await import("../src/lib/password.js");
    const passwordHash =
        overrides.passwordHash === undefined
            ? await hashPassword("StrongPassword123")
            : overrides.passwordHash;

    return repository.createUser({
        id: overrides.id ?? "11111111-1111-1111-1111-111111111111",
        name: overrides.name ?? "Kristian",
        email: overrides.email ?? "user@example.com",
        passwordHash,
        emailVerifiedAt: overrides.emailVerifiedAt ?? null,
        isActive: overrides.isActive ?? true,
        deletedAt: overrides.deletedAt ?? null,
    });
}

describe("AuthService register", () => {
    it("registers a user, hashes the password, and creates a session", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        const result = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        const storedUser = [...repository.users.values()][0];
        const storedSession = [...repository.sessions.values()][0];

        expect(result.user.email).toBe("user@example.com");
        expect(result.accessToken).toEqual(expect.any(String));
        expect(storedUser?.passwordHash).toMatch(/^\$argon2id\$/);
        expect(storedUser?.passwordHash).not.toBe("StrongPassword123");
        expect(storedSession).toBeDefined();
        expect(storedSession?.refreshTokenHash).toBe(hashRefreshToken(result.refreshToken));
        expect(storedSession?.refreshTokenHash).not.toBe(result.refreshToken);
    });

    it("rejects a duplicate email, including soft-deleted accounts", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        await seedUser(repository, { deletedAt: new Date() });

        try {
            await service.register(
                {
                    name: "Kristian",
                    email: "user@example.com",
                    password: "StrongPassword123",
                },
                context,
            );
            throw new Error("Expected register to fail");
        } catch (error) {
            expectAuthError(error, "EMAIL_ALREADY_EXISTS", 409);
        }
    });
});

describe("AuthService login", () => {
    it("logs in with valid credentials", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        await seedUser(repository);

        const result = await service.login(
            {
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        expect(result.user.email).toBe("user@example.com");
        expect(result.accessToken).toEqual(expect.any(String));
        expect(repository.sessions.size).toBe(1);
    });

    it("rejects a wrong password with a generic error", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        await seedUser(repository);

        try {
            await service.login(
                { email: "user@example.com", password: "WrongPassword123" },
                context,
            );
            throw new Error("Expected login to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_CREDENTIALS", 401);
        }
    });

    it("rejects an unknown email with a generic error", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        try {
            await service.login(
                { email: "missing@example.com", password: "StrongPassword123" },
                context,
            );
            throw new Error("Expected login to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_CREDENTIALS", 401);
        }
    });

    it("rejects a soft-deleted user", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        await seedUser(repository, { deletedAt: new Date() });

        try {
            await service.login(
                { email: "user@example.com", password: "StrongPassword123" },
                context,
            );
            throw new Error("Expected login to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_CREDENTIALS", 401);
        }

        expect(repository.sessions.size).toBe(0);
    });

    it("rejects an inactive user", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        await seedUser(repository, { isActive: false });

        try {
            await service.login(
                { email: "user@example.com", password: "StrongPassword123" },
                context,
            );
            throw new Error("Expected login to fail");
        } catch (error) {
            expectAuthError(error, "ACCOUNT_DISABLED", 403);
        }
    });

    it("rejects a social-only account without a password hash", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        await seedUser(repository, { passwordHash: null });

        try {
            await service.login(
                { email: "user@example.com", password: "StrongPassword123" },
                context,
            );
            throw new Error("Expected login to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_CREDENTIALS", 401);
        }
    });
});

describe("AuthService refresh", () => {
    it("rotates a valid refresh token and invalidates the old one", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const first = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        const rotated = await service.refresh(first.refreshToken);

        expect(rotated.accessToken).not.toBe(first.accessToken);
        expect(rotated.refreshToken).not.toBe(first.refreshToken);

        try {
            await service.refresh(first.refreshToken);
            throw new Error("Expected old refresh token to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_REFRESH_TOKEN", 401);
        }
    });

    it("rejects an invalid refresh token", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        try {
            await service.refresh("not-a-real-token");
            throw new Error("Expected refresh to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_REFRESH_TOKEN", 401);
        }
    });

    it("rejects an expired session", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const first = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const session = [...repository.sessions.values()][0] as AuthSessionRow;
        repository.sessions.set(session.id, {
            ...session,
            expiresAt: new Date(Date.now() - 1000),
        });

        try {
            await service.refresh(first.refreshToken);
            throw new Error("Expected refresh to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_REFRESH_TOKEN", 401);
        }
    });

    it("rejects a revoked session", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const first = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const session = [...repository.sessions.values()][0] as AuthSessionRow;
        repository.sessions.set(session.id, {
            ...session,
            revokedAt: new Date(),
        });

        try {
            await service.refresh(first.refreshToken);
            throw new Error("Expected refresh to fail");
        } catch (error) {
            expectAuthError(error, "INVALID_REFRESH_TOKEN", 401);
        }
    });
});

describe("AuthService logout", () => {
    it("revokes the current session", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const first = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        await service.logout(first.refreshToken);

        const session = [...repository.sessions.values()][0];
        expect(session?.revokedAt).toBeInstanceOf(Date);
    });

    it("succeeds when no refresh token is present", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        await expect(service.logout(undefined)).resolves.toBeUndefined();
    });
});

describe("AuthService me", () => {
    it("returns the user for a valid access token", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const first = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        const current = await service.authenticateAccessToken(first.accessToken);
        expect(current.user.email).toBe("user@example.com");
    });

    it("rejects an invalid access token", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        try {
            await service.authenticateAccessToken("invalid-token");
            throw new Error("Expected authentication to fail");
        } catch (error) {
            expectAuthError(error, "UNAUTHENTICATED", 401);
        }
    });

    it("rejects a deleted user", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const first = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const user = [...repository.users.values()][0] as UserRow;
        repository.users.set(user.id, { ...user, deletedAt: new Date() });

        try {
            await service.authenticateAccessToken(first.accessToken);
            throw new Error("Expected authentication to fail");
        } catch (error) {
            expectAuthError(error, "UNAUTHENTICATED", 401);
        }
    });

    it("rejects an inactive user", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const first = await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const user = [...repository.users.values()][0] as UserRow;
        repository.users.set(user.id, { ...user, isActive: false });

        try {
            await service.authenticateAccessToken(first.accessToken);
            throw new Error("Expected authentication to fail");
        } catch (error) {
            expectAuthError(error, "ACCOUNT_DISABLED", 403);
        }
    });
});
