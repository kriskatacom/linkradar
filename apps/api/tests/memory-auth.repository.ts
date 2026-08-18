import type { AuthRepository } from "../src/modules/auth/auth.repository.js";
import type {
    AuthSessionRow,
    NewAuthSessionRow,
    NewUserRow,
    RoleRow,
    UserRole,
    UserRow,
} from "../src/modules/auth/auth.types.js";
import { emailAlreadyExistsError } from "../src/modules/auth/auth.errors.js";
import {
    DuplicateSocialIdentityError,
    type NewUserSocialAccountRow,
    type SocialAuthRepository,
    type UserSocialAccountRow,
} from "../src/modules/auth/social/social-auth.repository.js";
import type { SocialProvider } from "../src/modules/auth/social/social-auth.types.js";

function withDefaults(data: NewUserRow): UserRow {
    const now = new Date();

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        isActive: data.isActive ?? true,
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
    readonly roles = new Map<UserRole, RoleRow>();
    readonly userRoles = new Map<string, Set<UserRole>>();
    initialAdminUserId: string | null = null;

    async ensureSystemRoles(): Promise<void> {
        if (!this.roles.has("admin")) {
            this.roles.set("admin", {
                id: "role-admin",
                name: "admin",
                label: "Administrator",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
        if (!this.roles.has("user")) {
            this.roles.set("user", {
                id: "role-user",
                name: "user",
                label: "User",
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }
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

    async getUserRoles(userId: string): Promise<UserRole[]> {
        const assigned = this.userRoles.get(userId);
        return assigned ? [...assigned.values()] : [];
    }

    async userHasRole(userId: string, roleName: UserRole): Promise<boolean> {
        const assigned = this.userRoles.get(userId);
        return assigned ? assigned.has(roleName) : false;
    }

    async assignRoleToUser(userId: string, roleName: UserRole): Promise<void> {
        await this.ensureSystemRoles();
        const current = this.userRoles.get(userId) ?? new Set<UserRole>();
        current.add(roleName);
        this.userRoles.set(userId, current);
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
    ): Promise<{ user: UserRow; roles: UserRole[] }> {
        await this.ensureSystemRoles();
        const user = await this.createUser(data);

        if (!this.initialAdminUserId) {
            this.initialAdminUserId = user.id;
            await this.assignRoleToUser(user.id, "admin");
        } else {
            await this.assignRoleToUser(user.id, "user");
        }

        return {
            user,
            roles: await this.getUserRoles(user.id),
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
