import type { AuthRepository } from "../src/modules/auth/auth.repository.js";
import type {
    AuthSessionRow,
    NewAuthSessionRow,
    NewUserRow,
    PermissionName,
    PermissionRow,
    RoleRow,
    ThemePreference,
    UserRole,
    UserRow,
} from "../src/modules/auth/auth.types.js";
import { emailAlreadyExistsError } from "../src/modules/auth/auth.errors.js";
import {
    DEFAULT_USER_PERMISSIONS,
    SYSTEM_PERMISSION_DEFINITIONS,
} from "../src/modules/auth/rbac/system-permissions.js";
import {
    DuplicateSocialIdentityError,
    type NewUserSocialAccountRow,
    type SocialAuthRepository,
    type UserSocialAccountRow,
} from "../src/modules/auth/social/social-auth.repository.js";
import type { SocialProvider } from "../src/modules/auth/social/social-auth.types.js";
import {
    ensureMemoryPersonalWorkspace,
    MemoryWorkspaceStore,
} from "./memory-workspace.repository.js";

function withDefaults(data: NewUserRow): UserRow {
    const now = new Date();

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        isActive: data.isActive ?? true,
        theme: data.theme ?? "system",
        deletedAt: data.deletedAt ?? null,
        createdAt: data.createdAt ?? now,
        updatedAt: data.updatedAt ?? now,
    };
}

function withSessionDefaults(data: NewAuthSessionRow): AuthSessionRow {
    return {
        id: data.id,
        userId: data.userId,
        refreshTokenHash: data.refreshTokenHash,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt,
        revokedAt: data.revokedAt ?? null,
        createdAt: data.createdAt ?? new Date(),
    };
}

export class MemoryAuthRepository implements AuthRepository, SocialAuthRepository {
    readonly users = new Map<string, UserRow>();
    readonly sessions = new Map<string, AuthSessionRow>();
    readonly socialAccounts = new Map<string, UserSocialAccountRow>();
    readonly roles = new Map<string, RoleRow>();
    readonly permissions = new Map<string, PermissionRow>();
    readonly userRoles = new Map<string, Set<UserRole>>();
    readonly rolePermissions = new Map<string, Set<string>>();
    readonly workspaceStore = new MemoryWorkspaceStore();
    initialAdminUserId: string | null = null;

    async ensureSystemRoles(): Promise<void> {
        if (!this.roles.has("admin")) {
            this.roles.set("admin", {
                id: "11111111-1111-4111-8111-111111111111",
                name: "admin",
                label: "Administrator",
                isSystem: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        if (!this.roles.has("user")) {
            this.roles.set("user", {
                id: "22222222-2222-4222-8222-222222222222",
                name: "user",
                label: "User",
                isSystem: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
    }

    async ensureSystemPermissions(): Promise<void> {
        for (const definition of SYSTEM_PERMISSION_DEFINITIONS) {
            if (!this.permissions.has(definition.name)) {
                const now = new Date();
                this.permissions.set(definition.name, {
                    id: `perm-${definition.name}`,
                    name: definition.name,
                    label: definition.label,
                    description: definition.description,
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }
    }

    async ensureDefaultRolePermissions(): Promise<void> {
        await this.ensureSystemRoles();
        await this.ensureSystemPermissions();

        const adminRole = this.roles.get("admin");
        const userRole = this.roles.get("user");
        if (!adminRole || !userRole) {
            throw new Error("Required roles are missing.");
        }

        for (const permission of this.permissions.values()) {
            await this.assignPermissionToRole(adminRole.id, permission.id);
        }

        for (const permissionName of DEFAULT_USER_PERMISSIONS) {
            const permission = this.permissions.get(permissionName);
            if (!permission) {
                throw new Error(`Permission ${permissionName} is missing.`);
            }
            await this.assignPermissionToRole(userRole.id, permission.id);
        }
    }

    async ensureRbacBootstrap(): Promise<void> {
        await this.ensureSystemRoles();
        await this.ensureSystemPermissions();
        await this.ensureDefaultRolePermissions();
    }

    async findUserByEmail(email: string): Promise<UserRow | null> {
        return [...this.users.values()].find((user) => user.email === email) ?? null;
    }

    async findUserById(id: string): Promise<UserRow | null> {
        return this.users.get(id) ?? null;
    }

    async findRoleByName(name: UserRole): Promise<RoleRow | null> {
        return this.roles.get(name) ?? null;
    }

    async findPermissionByName(name: PermissionName): Promise<PermissionRow | null> {
        return this.permissions.get(name) ?? null;
    }

    async getPermissions(): Promise<PermissionRow[]> {
        return [...this.permissions.values()];
    }

    async getUserRoles(userId: string): Promise<UserRole[]> {
        const assigned = this.userRoles.get(userId);
        return assigned ? [...assigned.values()] : [];
    }

    async getRolePermissions(roleId: string): Promise<PermissionName[]> {
        const permissionIds = this.rolePermissions.get(roleId) ?? new Set<string>();
        const names: PermissionName[] = [];

        for (const permissionId of permissionIds) {
            const permission = [...this.permissions.values()].find(
                (item) => item.id === permissionId,
            );
            if (permission) {
                names.push(permission.name);
            }
        }

        return names;
    }

    async getUserPermissions(userId: string): Promise<PermissionName[]> {
        const roleNames = await this.getUserRoles(userId);
        const permissionNames = new Set<PermissionName>();

        for (const roleName of roleNames) {
            const role = this.roles.get(roleName);
            if (!role) {
                continue;
            }

            const rolePermissions = await this.getRolePermissions(role.id);
            for (const permissionName of rolePermissions) {
                permissionNames.add(permissionName);
            }
        }

        return [...permissionNames.values()];
    }

    async userHasRole(userId: string, roleName: UserRole): Promise<boolean> {
        const assigned = this.userRoles.get(userId);
        return assigned ? assigned.has(roleName) : false;
    }

    async roleHasPermission(roleId: string, permissionName: PermissionName): Promise<boolean> {
        const rolePermissionNames = await this.getRolePermissions(roleId);
        return rolePermissionNames.includes(permissionName);
    }

    async userHasPermission(userId: string, permissionName: PermissionName): Promise<boolean> {
        const permissionNames = await this.getUserPermissions(userId);
        return permissionNames.includes(permissionName);
    }

    async assignRoleToUser(userId: string, roleName: UserRole): Promise<void> {
        await this.ensureSystemRoles();
        const current = this.userRoles.get(userId) ?? new Set<UserRole>();
        current.add(roleName);
        this.userRoles.set(userId, current);
    }

    async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
        const current = this.rolePermissions.get(roleId) ?? new Set<string>();
        current.add(permissionId);
        this.rolePermissions.set(roleId, current);
    }

    async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
        const current = this.rolePermissions.get(roleId);
        if (!current) {
            return;
        }
        current.delete(permissionId);
    }

    async createUser(data: NewUserRow): Promise<UserRow> {
        if (await this.findUserByEmail(data.email)) {
            throw emailAlreadyExistsError();
        }

        const user = withDefaults(data);
        this.users.set(user.id, user);
        return user;
    }

    async createUserWithInitialRole(
        data: NewUserRow,
    ): Promise<{ user: UserRow; roles: UserRole[]; permissions: PermissionName[] }> {
        await this.ensureRbacBootstrap();
        const user = await this.createUser(data);

        if (!this.initialAdminUserId) {
            this.initialAdminUserId = user.id;
            await this.assignRoleToUser(user.id, "admin");
        } else {
            await this.assignRoleToUser(user.id, "user");
        }

        ensureMemoryPersonalWorkspace(this.workspaceStore, user);

        return {
            user,
            roles: await this.getUserRoles(user.id),
            permissions: await this.getUserPermissions(user.id),
        };
    }

    async createSession(data: NewAuthSessionRow): Promise<AuthSessionRow> {
        const session = withSessionDefaults(data);
        this.sessions.set(session.id, session);
        return session;
    }

    async findSessionById(id: string): Promise<AuthSessionRow | null> {
        return this.sessions.get(id) ?? null;
    }

    async findSessionByRefreshTokenHash(hash: string): Promise<AuthSessionRow | null> {
        return (
            [...this.sessions.values()].find((session) => session.refreshTokenHash === hash) ?? null
        );
    }

    async rotateSessionRefreshToken(input: {
        sessionId: string;
        oldHash: string;
        newHash: string;
        expiresAt: Date;
    }): Promise<boolean> {
        const session = this.sessions.get(input.sessionId);

        if (!session || session.refreshTokenHash !== input.oldHash) {
            return false;
        }

        this.sessions.set(input.sessionId, {
            ...session,
            refreshTokenHash: input.newHash,
            expiresAt: input.expiresAt,
        });

        return true;
    }

    async deleteSession(id: string): Promise<void> {
        this.sessions.delete(id);
    }

    async deleteSessionByRefreshTokenHash(hash: string): Promise<void> {
        const session = await this.findSessionByRefreshTokenHash(hash);

        if (session) {
            this.sessions.delete(session.id);
        }
    }

    async deleteExpiredSessions(): Promise<number> {
        const now = Date.now();
        let deleted = 0;

        for (const [id, session] of this.sessions) {
            if (session.expiresAt.getTime() <= now) {
                this.sessions.delete(id);
                deleted += 1;
            }
        }

        return deleted;
    }

    async deleteSessionsForUser(userId: string): Promise<number> {
        let deleted = 0;

        for (const [id, session] of this.sessions) {
            if (session.userId === userId) {
                this.sessions.delete(id);
                deleted += 1;
            }
        }

        return deleted;
    }

    async updateUserTheme(userId: string, theme: ThemePreference): Promise<UserRow> {
        const user = this.users.get(userId);
        if (!user) {
            throw new Error("User not found.");
        }

        const updated = { ...user, theme, updatedAt: new Date() };
        this.users.set(userId, updated);
        return updated;
    }

    async findByProviderIdentity(
        provider: SocialProvider,
        providerUserId: string,
    ): Promise<UserSocialAccountRow | null> {
        return (
            [...this.socialAccounts.values()].find(
                (account) =>
                    account.provider === provider && account.providerUserId === providerUserId,
            ) ?? null
        );
    }

    async createUserAndSocialAccount(
        user: NewUserRow,
        socialAccount: NewUserSocialAccountRow,
    ): Promise<{ user: UserRow; socialAccount: UserSocialAccountRow }> {
        if (
            await this.findByProviderIdentity(
                socialAccount.provider as SocialProvider,
                socialAccount.providerUserId,
            )
        ) {
            throw new DuplicateSocialIdentityError();
        }

        const createdUser = await this.createUser(user);
        ensureMemoryPersonalWorkspace(this.workspaceStore, createdUser);
        const createdSocial: UserSocialAccountRow = {
            id: socialAccount.id,
            userId: createdUser.id,
            provider: socialAccount.provider,
            providerUserId: socialAccount.providerUserId,
            providerEmail: socialAccount.providerEmail ?? null,
            createdAt: socialAccount.createdAt ?? new Date(),
            updatedAt: socialAccount.updatedAt ?? new Date(),
        };
        this.socialAccounts.set(createdSocial.id, createdSocial);
        return { user: createdUser, socialAccount: createdSocial };
    }
}
