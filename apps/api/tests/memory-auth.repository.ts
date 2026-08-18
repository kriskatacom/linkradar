import type { AuthRepository } from "../src/modules/auth/auth.repository.js";
import type {
    AuthSessionRow,
    NewAuthSessionRow,
    NewUserRow,
    UserRow,
} from "../src/modules/auth/auth.types.js";

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

export class MemoryAuthRepository implements AuthRepository {
    readonly users = new Map<string, UserRow>();
    readonly sessions = new Map<string, AuthSessionRow>();

    async findUserByEmail(email: string): Promise<UserRow | null> {
        return [...this.users.values()].find((user) => user.email === email) ?? null;
    }

    async findUserById(id: string): Promise<UserRow | null> {
        return this.users.get(id) ?? null;
    }

    async createUser(data: NewUserRow): Promise<UserRow> {
        const user = withDefaults(data);
        this.users.set(user.id, user);
        return user;
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

        if (!session || session.refreshTokenHash !== input.oldHash || session.revokedAt !== null) {
            return false;
        }

        this.sessions.set(input.sessionId, {
            ...session,
            refreshTokenHash: input.newHash,
            expiresAt: input.expiresAt,
        });

        return true;
    }

    async revokeSession(id: string): Promise<void> {
        const session = this.sessions.get(id);

        if (!session || session.revokedAt !== null) {
            return;
        }

        this.sessions.set(id, { ...session, revokedAt: new Date() });
    }

    async revokeSessionByRefreshTokenHash(hash: string): Promise<void> {
        const session = await this.findSessionByRefreshTokenHash(hash);

        if (!session || session.revokedAt !== null) {
            return;
        }

        this.sessions.set(session.id, { ...session, revokedAt: new Date() });
    }
}
