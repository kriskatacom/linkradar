import type { AuthSessionRow, NewAuthSessionRow, NewUserRow, UserRow } from "./auth.types.js";

export interface AuthRepository {
    findUserByEmail(email: string): Promise<UserRow | null>;
    findUserById(id: string): Promise<UserRow | null>;
    createUser(data: NewUserRow): Promise<UserRow>;
    createSession(data: NewAuthSessionRow): Promise<AuthSessionRow>;
    findSessionById(id: string): Promise<AuthSessionRow | null>;
    findSessionByRefreshTokenHash(hash: string): Promise<AuthSessionRow | null>;
    rotateSessionRefreshToken(input: {
        sessionId: string;
        oldHash: string;
        newHash: string;
        expiresAt: Date;
    }): Promise<boolean>;
    deleteSession(id: string): Promise<void>;
    deleteSessionByRefreshTokenHash(hash: string): Promise<void>;
    deleteExpiredSessions(): Promise<number>;
    deleteSessionsForUser(userId: string): Promise<number>;
}
