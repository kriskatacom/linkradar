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
    revokeSession(id: string): Promise<void>;
    revokeSessionByRefreshTokenHash(hash: string): Promise<void>;
}
