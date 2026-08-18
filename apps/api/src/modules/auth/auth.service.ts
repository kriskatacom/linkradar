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
    RequestContext,
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
        const user = await this.repository.createUser({
            id: randomUUID(),
            name: input.name,
            email: input.email,
            passwordHash,
            emailVerifiedAt: null,
            isActive: true,
            deletedAt: null,
        });

        return this.issueAuth(user, context);
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

        return this.issueAuth(user, context);
    }

    async refresh(refreshToken: string | undefined): Promise<AuthTokensResult> {
        if (!refreshToken) {
            throw invalidRefreshTokenError();
        }

        const session = await this.requireUsableSession(refreshToken);
        const user = await this.requireUsableUser(session.userId);
        const oldHash = hashRefreshToken(refreshToken);
        const nextRefreshToken = generateRefreshToken();
        const rotated = await this.repository.rotateSessionRefreshToken({
            sessionId: session.id,
            oldHash,
            newHash: hashRefreshToken(nextRefreshToken),
            expiresAt: this.buildRefreshExpiry(),
        });

        if (!rotated) {
            throw invalidRefreshTokenError();
        }

        return {
            user: toAuthenticatedUser(user),
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

        await this.repository.revokeSessionByRefreshTokenHash(hashRefreshToken(refreshToken));
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

        if (!this.isSessionUsable(session) || session.userId !== user.id) {
            throw unauthenticatedError();
        }

        return {
            user: toAuthenticatedUser(user),
            sessionId: session.id,
        };
    }

    private async issueAuth(user: UserRow, context: RequestContext): Promise<AuthTokensResult> {
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

        return {
            user: toAuthenticatedUser(user),
            accessToken: await signAccessToken({
                sub: user.id,
                sessionId,
            }),
            refreshToken,
        };
    }

    private async requireUsableSession(refreshToken: string): Promise<AuthSessionRow> {
        const session = await this.repository.findSessionByRefreshTokenHash(
            hashRefreshToken(refreshToken),
        );

        if (!this.isSessionUsable(session)) {
            throw invalidRefreshTokenError();
        }

        return session;
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

    private isSessionUsable(session: AuthSessionRow | null): session is AuthSessionRow {
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
}
