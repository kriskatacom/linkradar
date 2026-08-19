import { randomUUID } from "node:crypto";

import { getApiEnv } from "../../config/env.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
    generateRefreshToken,
    hashRefreshToken,
    signAccessToken,
    verifyAccessToken,
} from "../../lib/tokens.js";
import { defaultMailer } from "../mail/mail.service.js";
import type { Mailer } from "../mail/mail.types.js";
import {
    accountDisabledError,
    emailAlreadyExistsError,
    expiredEmailTokenError,
    invalidCredentialsError,
    invalidEmailTokenError,
    invalidRefreshTokenError,
    unauthenticatedError,
    usedEmailTokenError,
} from "./auth.errors.js";
import type { AuthRepository } from "./auth.repository.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import type {
    AuthenticatedUser,
    AuthSessionRow,
    AuthTokensResult,
    PermissionName,
    RequestContext,
    ThemePreference,
    UserRole,
    UserRow,
} from "./auth.types.js";
import { toAuthenticatedUser } from "./auth.types.js";

export const FORGOT_PASSWORD_MESSAGE =
    "If an account exists for this email, a reset email has been sent.";

export const EMAIL_VERIFICATION_REQUEST_MESSAGE =
    "If your email still needs verification, we have sent a link.";

const EMAIL_VERIFICATION_HOURS = 24;
const PASSWORD_RESET_HOURS = 1;

export class AuthService {
    constructor(
        private readonly repository: AuthRepository,
        private readonly mailer: Mailer = defaultMailer(),
    ) {}

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

        const session = await this.createSessionForUser(
            created.user,
            context,
            created.roles,
            created.permissions,
        );
        await this.safeSend(() => this.sendRegistrationEmail(created.user));
        return session;
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

        const session = await this.createSessionForUser(user, context);
        await this.safeSend(() =>
            this.mailer.sendNewLoginEmail({
                name: user.name,
                email: user.email,
                time: new Date().toISOString(),
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
            }),
        );
        return session;
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

    async updateTheme(userId: string, theme: ThemePreference): Promise<AuthenticatedUser> {
        const user = await this.requireUsableUser(userId);
        const updated = await this.repository.updateUserTheme(user.id, theme);
        const { roles, permissions } = await this.loadUserAuthorization(updated.id);
        return toAuthenticatedUser(updated, roles, permissions);
    }

    async requestEmailVerification(input: { userId?: string; email?: string }): Promise<void> {
        const user = input.userId
            ? await this.repository.findUserById(input.userId)
            : input.email
              ? await this.repository.findUserByEmail(input.email)
              : null;

        if (!user || user.deletedAt !== null || !user.isActive || user.emailVerifiedAt !== null) {
            return;
        }

        await this.sendVerificationEmail(user);
    }

    async verifyEmail(rawToken: string): Promise<AuthenticatedUser> {
        const token = await this.repository.findEmailVerificationTokenByHash(
            hashRefreshToken(rawToken),
        );
        this.assertTokenUsable(token);

        const user = await this.requireUsableUser(token.userId);
        const verified = await this.repository.markEmailVerified(user.id);
        await this.repository.markEmailVerificationTokenUsed(token.id, new Date());
        const { roles, permissions } = await this.loadUserAuthorization(verified.id);
        return toAuthenticatedUser(verified, roles, permissions);
    }

    async forgotPassword(email: string): Promise<void> {
        const user = await this.repository.findUserByEmail(email);
        if (!user || user.deletedAt !== null || !user.isActive || !user.passwordHash) {
            return;
        }

        const token = await this.issuePasswordResetToken(user.id);
        await this.safeSend(() =>
            this.mailer.sendPasswordResetEmail({
                name: user.name,
                email: user.email,
                actionUrl: `${getApiEnv().appUrl}/reset-password?token=${token}`,
            }),
        );
    }

    async resetPassword(rawToken: string, password: string): Promise<void> {
        const token = await this.repository.findPasswordResetTokenByHash(
            hashRefreshToken(rawToken),
        );
        this.assertTokenUsable(token);

        const user = await this.requireUsableUser(token.userId);
        const passwordHash = await hashPassword(password);
        await this.repository.updateUserPassword(user.id, passwordHash);
        await this.repository.markPasswordResetTokenUsed(token.id, new Date());
        await this.repository.deleteUnusedPasswordResetTokensForUser(user.id);
        await this.repository.deleteSessionsForUser(user.id);
        await this.safeSend(() =>
            this.mailer.sendPasswordChangedEmail({
                name: user.name,
                email: user.email,
            }),
        );
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

    private async sendRegistrationEmail(user: UserRow): Promise<void> {
        const token = await this.issueEmailVerificationToken(user.id);
        await this.safeSend(() =>
            this.mailer.sendWelcomeAndVerificationEmail({
                name: user.name,
                email: user.email,
                actionUrl: `${getApiEnv().appUrl}/verify-email?token=${token}`,
            }),
        );
    }

    private async sendVerificationEmail(user: UserRow): Promise<void> {
        const token = await this.issueEmailVerificationToken(user.id);
        await this.safeSend(() =>
            this.mailer.sendVerificationEmail({
                name: user.name,
                email: user.email,
                actionUrl: `${getApiEnv().appUrl}/verify-email?token=${token}`,
            }),
        );
    }

    private async issueEmailVerificationToken(userId: string): Promise<string> {
        await this.repository.deleteUnusedEmailVerificationTokensForUser(userId);
        const token = generateRefreshToken();
        await this.repository.createEmailVerificationToken({
            id: randomUUID(),
            userId,
            tokenHash: hashRefreshToken(token),
            expiresAt: this.hoursFromNow(EMAIL_VERIFICATION_HOURS),
            usedAt: null,
        });
        return token;
    }

    private async issuePasswordResetToken(userId: string): Promise<string> {
        await this.repository.deleteUnusedPasswordResetTokensForUser(userId);
        const token = generateRefreshToken();
        await this.repository.createPasswordResetToken({
            id: randomUUID(),
            userId,
            tokenHash: hashRefreshToken(token),
            expiresAt: this.hoursFromNow(PASSWORD_RESET_HOURS),
            usedAt: null,
        });
        return token;
    }

    private assertTokenUsable<T extends { expiresAt: Date; usedAt: Date | null }>(
        token: T | null,
    ): asserts token is T {
        if (!token) {
            throw invalidEmailTokenError();
        }

        if (token.usedAt) {
            throw usedEmailTokenError();
        }

        if (token.expiresAt.getTime() <= Date.now()) {
            throw expiredEmailTokenError();
        }
    }

    private hoursFromNow(hours: number): Date {
        return new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    private async safeSend(task: () => Promise<void>): Promise<void> {
        try {
            await task();
        } catch {
            // Email delivery must not undo a successful auth side effect.
        }
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
