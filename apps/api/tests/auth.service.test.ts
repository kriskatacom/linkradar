import { describe, expect, it } from "vitest";

import { hashRefreshToken } from "../src/lib/tokens.js";
import { AuthError } from "../src/modules/auth/auth.errors.js";
import { SYSTEM_PERMISSIONS } from "../src/modules/auth/rbac/system-permissions.js";
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
        expect(result.user.roles).toEqual(["admin"]);
        expect(result.user.permissions).toContain(SYSTEM_PERMISSIONS.ADMIN_ACCESS);
    });

    it("assigns admin to first user, then user role to next users", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        const first = await service.register(
            {
                name: "First",
                email: "first@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const second = await service.register(
            {
                name: "Second",
                email: "second@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const third = await service.register(
            {
                name: "Third",
                email: "third@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        expect(first.user.roles).toEqual(["admin"]);
        expect(second.user.roles).toEqual(["user"]);
        expect(third.user.roles).toEqual(["user"]);
    });

    it("does not reassign admin when the initial admin is soft-deleted", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        const first = await service.register(
            {
                name: "First",
                email: "first@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const firstUser = repository.users.get(first.user.id) as UserRow;
        repository.users.set(first.user.id, { ...firstUser, deletedAt: new Date() });

        const second = await service.register(
            {
                name: "Second",
                email: "second@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        expect(second.user.roles).toEqual(["user"]);
    });

    it("keeps only one initial admin under concurrent registration", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        const [first, second] = await Promise.all([
            service.register(
                {
                    name: "Parallel A",
                    email: "parallel-a@example.com",
                    password: "StrongPassword123",
                },
                context,
            ),
            service.register(
                {
                    name: "Parallel B",
                    email: "parallel-b@example.com",
                    password: "StrongPassword123",
                },
                context,
            ),
        ]);

        const adminCount = [first.user, second.user].filter((user) =>
            user.roles.includes("admin"),
        ).length;
        expect(adminCount).toBe(1);
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

        expect(repository.sessions.size).toBe(1);
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

        expect(repository.sessions.size).toBe(0);
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

        expect(repository.sessions.size).toBe(0);
    });
});

describe("AuthService logout", () => {
    it("physically deletes the current session", async () => {
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

        expect(repository.sessions.size).toBe(0);
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
        expect(current.user.roles).toEqual(["admin"]);
        expect(current.user.permissions).toContain(SYSTEM_PERMISSIONS.ADMIN_ACCESS);
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

    it("does not delete the session when the access JWT is expired", async () => {
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
        const { SignJWT } = await import("jose");
        const { getApiEnv } = await import("../src/config/env.js");
        const expiredToken = await new SignJWT({ sessionId: session.id })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(first.user.id)
            .setIssuedAt()
            .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
            .sign(new TextEncoder().encode(getApiEnv().jwtAccessSecret));

        try {
            await service.authenticateAccessToken(expiredToken);
            throw new Error("Expected authentication to fail");
        } catch (error) {
            expectAuthError(error, "UNAUTHENTICATED", 401);
        }

        expect(repository.sessions.size).toBe(1);
    });
});

describe("AuthService session cleanup", () => {
    it("deleteExpiredSessions removes only expired rows", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        await service.register(
            {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const live = [...repository.sessions.values()][0] as AuthSessionRow;
        await repository.createSession({
            id: "expired-session",
            userId: live.userId,
            refreshTokenHash: "expired-hash",
            userAgent: null,
            ipAddress: null,
            expiresAt: new Date(Date.now() - 1000),
            revokedAt: null,
        });

        const deleted = await service.deleteExpiredSessions();

        expect(deleted).toBe(1);
        expect(repository.sessions.size).toBe(1);
        expect(repository.sessions.has(live.id)).toBe(true);
    });

    it("deleteSessionsForUser removes every session for that user", async () => {
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
        await service.login({ email: "user@example.com", password: "StrongPassword123" }, context);

        const deleted = await service.deleteSessionsForUser(first.user.id);

        expect(deleted).toBe(2);
        expect(repository.sessions.size).toBe(0);
    });
});

describe("AuthService roles", () => {
    it("creates system roles idempotently", async () => {
        const repository = new MemoryAuthRepository();
        await repository.ensureSystemRoles();
        await repository.ensureSystemRoles();

        expect(repository.roles.size).toBe(2);
        expect(repository.roles.has("admin")).toBe(true);
        expect(repository.roles.has("user")).toBe(true);
    });

    it("prevents duplicate role assignment", async () => {
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

        await repository.assignRoleToUser(first.user.id, "admin");
        await repository.assignRoleToUser(first.user.id, "admin");
        const roles = await repository.getUserRoles(first.user.id);

        expect(roles).toEqual(["admin"]);
    });
});

describe("AuthService permissions", () => {
    it("bootstraps permissions idempotently", async () => {
        const repository = new MemoryAuthRepository();

        await repository.ensureRbacBootstrap();
        await repository.ensureRbacBootstrap();

        expect(repository.permissions.size).toBeGreaterThan(0);
        const adminRole = await repository.findRoleByName("admin");
        const userRole = await repository.findRoleByName("user");
        expect(adminRole).not.toBeNull();
        expect(userRole).not.toBeNull();
    });

    it("admin gets all system permissions and user gets only allow-list", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);

        const admin = await service.register(
            {
                name: "Admin",
                email: "admin@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const user = await service.register(
            {
                name: "User",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        expect(admin.user.permissions.length).toBe(25);
        expect(admin.user.permissions).toContain(SYSTEM_PERMISSIONS.USERS_VIEW);
        expect(user.user.permissions).toContain(SYSTEM_PERMISSIONS.SITES_VIEW);
        expect(user.user.permissions).not.toContain(SYSTEM_PERMISSIONS.USERS_VIEW);
        expect(user.user.permissions).not.toContain(SYSTEM_PERMISSIONS.ADMIN_ACCESS);
    });

    it("user permission union across multiple roles has no duplicates", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const user = await service.register(
            {
                name: "User",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        repository.roles.set("manager", {
            id: "role-manager",
            name: "manager",
            label: "Manager",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await repository.assignRoleToUser(user.user.id, "manager");

        const reportsExport = await repository.findPermissionByName(SYSTEM_PERMISSIONS.REPORTS_EXPORT);
        const sitesView = await repository.findPermissionByName(SYSTEM_PERMISSIONS.SITES_VIEW);
        if (!reportsExport || !sitesView) {
            throw new Error("Missing seeded permissions.");
        }
        await repository.assignPermissionToRole("role-manager", reportsExport.id);
        await repository.assignPermissionToRole("role-manager", sitesView.id);

        const permissions = await repository.getUserPermissions(user.user.id);

        expect(permissions).toContain(SYSTEM_PERMISSIONS.SITES_VIEW);
        expect(permissions).toContain(SYSTEM_PERMISSIONS.REPORTS_EXPORT);
        expect(permissions.filter((name) => name === SYSTEM_PERMISSIONS.SITES_VIEW)).toHaveLength(1);
    });

    it("admin gets newly added permissions after bootstrap, user does not", async () => {
        const repository = new MemoryAuthRepository();
        const service = new AuthService(repository);
        const admin = await service.register(
            {
                name: "Admin",
                email: "admin@example.com",
                password: "StrongPassword123",
            },
            context,
        );
        const user = await service.register(
            {
                name: "User",
                email: "user@example.com",
                password: "StrongPassword123",
            },
            context,
        );

        repository.permissions.set("billing.view", {
            id: "perm-billing-view",
            name: "billing.view",
            label: "View billing",
            description: "Allows viewing billing information.",
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await repository.ensureDefaultRolePermissions();

        const adminPermissions = await repository.getUserPermissions(admin.user.id);
        const userPermissions = await repository.getUserPermissions(user.user.id);

        expect(adminPermissions).toContain("billing.view");
        expect(userPermissions).not.toContain("billing.view");
    });

    it("prevents duplicate role-permission assignments", async () => {
        const repository = new MemoryAuthRepository();
        await repository.ensureRbacBootstrap();
        const adminRole = await repository.findRoleByName("admin");
        const permission = await repository.findPermissionByName(SYSTEM_PERMISSIONS.ADMIN_ACCESS);
        if (!adminRole || !permission) {
            throw new Error("Required RBAC records are missing.");
        }

        await repository.assignPermissionToRole(adminRole.id, permission.id);
        await repository.assignPermissionToRole(adminRole.id, permission.id);

        const rolePermissions = await repository.getRolePermissions(adminRole.id);
        expect(rolePermissions.filter((name) => name === SYSTEM_PERMISSIONS.ADMIN_ACCESS)).toHaveLength(
            1,
        );
    });
});
