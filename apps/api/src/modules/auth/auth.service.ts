import { randomUUID } from "node:crypto";

import { getApiEnv } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
    generateRefreshToken,
    hashRefreshToken,
    signAccessToken,
    verifyAccessToken,
} from "../../lib/tokens.js";
import {
    accountDisabledError,
    emailAlreadyExistsError,
    invalidCredentialsError,
    invalidRefreshTokenError,
    unauthenticatedError,
} from "./auth.errors.js";
import type { AuthRepository } from "./auth.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import type {
    AuthenticatedUser,
    AuthSessionRow,
    AuthTokensResult,
    PermissionName,
    RequestContext,
    UserRole,
    UserRow,
} from "./auth.types.js";
import { toAuthenticatedUser } from "./auth.types.js";

export class AuthService {
    constructor(private readonly repository: AuthRepository) {}

    async register(input: RegisterInput, context: RequestContext): Promise<AuthTokensResult> {
        const existing = await this.repository.findUserByEmail(input.email);

        if (existing) {
            throw emailAlreadyExistsError();
        }

        const passwordHash = await hashPassword(input.password);
        const created = await this.repository.createUserWithInitialRole({
            id: randomUUID(),
            name: input.name,
            email: input.email,
            passwordHash,
            emailVerifiedAt: null,
            isActive: true,
            deletedAt: null,
        });

        return this.createSessionForUser(created.user, context, created.roles, created.permissions);
    }

    async login(input: LoginInput, context: RequestContext): Promise<AuthTokensResult> {
        const user = await this.repository.findUserByEmail(input.email);

        if (!user || user.deletedAt !== null) {
            throw invalidCredentialsError();
        }

        if (!user.isActive) {
            throw accountDisabledError();
        }

        if (!user.passwordHash) {
            throw invalidCredentialsError();
        }

        const passwordMatches = await verifyPassword(user.passwordHash, input.password);

        if (!passwordMatches) {
            throw invalidCredentialsError();
        }

        return this.createSessionForUser(user, context);
    }

    async refresh(refreshToken: string | undefined): Promise<AuthTokensResult> {
        if (!refreshToken) {
            throw invalidRefreshTokenError();
        }

        const session = await this.repository.findSessionByRefreshTokenHash(
            hashRefreshToken(refreshToken),
        );

        if (!session) {
            throw invalidRefreshTokenError();
        }

        if (!this.isSessionUsable(session)) {
            await this.repository.deleteSession(session.id);
            throw invalidRefreshTokenError();
        }

        const user = await this.repository.findUserById(session.userId);

        if (!user || user.deletedAt !== null) {
            await this.repository.deleteSessionsForUser(session.userId);
            throw invalidRefreshTokenError();
        }

        if (!user.isActive) {
            await this.repository.deleteSession(session.id);
            throw invalidRefreshTokenError();
        }

        const nextRefreshToken = generateRefreshToken();
        const rotated = await this.repository.rotateSessionRefreshToken({
            sessionId: session.id,
            oldHash: hashRefreshToken(refreshToken),
            newHash: hashRefreshToken(nextRefreshToken),
            expiresAt: this.buildRefreshExpiry(),
        });

        if (!rotated) {
            await this.repository.deleteSession(session.id);
            throw invalidRefreshTokenError();
        }

        const { roles, permissions } = await this.loadUserAuthorization(user.id);

        return {
            user: toAuthenticatedUser(user, roles, permissions),
            accessToken: await signAccessToken({
                sub: user.id,
                sessionId: session.id,
            }),
            refreshToken: nextRefreshToken,
        };
    }

    async logout(refreshToken: string | undefined): Promise<void> {
        if (!refreshToken) {
            return;
        }

        await this.repository.deleteSessionByRefreshTokenHash(hashRefreshToken(refreshToken));
    }

    async deleteExpiredSessions(): Promise<number> {
        return this.repository.deleteExpiredSessions();
    }

    async deleteSessionsForUser(userId: string): Promise<number> {
        return this.repository.deleteSessionsForUser(userId);
    }

    async authenticateAccessToken(
        accessToken: string,
    ): Promise<{ user: AuthenticatedUser; sessionId: string }> {
        let payload;

        try {
            payload = await verifyAccessToken(accessToken);
        } catch {
            throw unauthenticatedError();
        }

        const user = await this.requireUsableUser(payload.sub);
        const session = await this.repository.findSessionById(payload.sessionId);

        if (!session || !this.isSessionUsable(session) || session.userId !== user.id) {
            throw unauthenticatedError();
        }

        const { roles, permissions } = await this.loadUserAuthorization(user.id);
        return { user: toAuthenticatedUser(user, roles, permissions), sessionId: session.id };
    }

    async createSessionForUser(
        user: UserRow,
        context: RequestContext,
        knownRoles?: UserRole[],
        knownPermissions?: PermissionName[],
    ): Promise<AuthTokensResult> {
        const sessionId = randomUUID();
        const refreshToken = generateRefreshToken();

        await this.repository.createSession({
            id: sessionId,
            userId: user.id,
            refreshTokenHash: hashRefreshToken(refreshToken),
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
            expiresAt: this.buildRefreshExpiry(),
            revokedAt: null,
        });

        const roles = knownRoles ?? (await this.repository.getUserRoles(user.id));
        const permissions = knownPermissions ?? (await this.repository.getUserPermissions(user.id));

        return {
            user: toAuthenticatedUser(user, roles, permissions),
            accessToken: await signAccessToken({
                sub: user.id,
                sessionId,
            }),
            refreshToken,
        };
    }

    private async requireUsableUser(userId: string): Promise<UserRow> {
        const user = await this.repository.findUserById(userId);

        if (!user || user.deletedAt !== null) {
            throw unauthenticatedError();
        }

        if (!user.isActive) {
            throw accountDisabledError();
        }

        return user;
    }

    private isSessionUsable(session: AuthSessionRow | null): boolean {
        if (!session || session.revokedAt !== null) {
            return false;
        }

        return session.expiresAt.getTime() > Date.now();
    }

    private buildRefreshExpiry(): Date {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + getApiEnv().refreshTokenDays);
        return expiresAt;
    }

    private async loadUserAuthorization(
        userId: string,
    ): Promise<{ roles: UserRole[]; permissions: PermissionName[] }> {
        const [roles, permissions] = await Promise.all([
            this.repository.getUserRoles(userId),
            this.repository.getUserPermissions(userId),
        ]);

        return { roles, permissions };
    }
}
