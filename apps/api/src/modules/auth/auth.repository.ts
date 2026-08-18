import type {
    AuthSessionRow,
    NewAuthSessionRow,
    NewUserRow,
    RoleRow,
    UserRole,
    UserRow,
} from "./auth.types.js";

export interface AuthRepository {
    ensureSystemRoles(): Promise<void>;
    findUserByEmail(email: string): Promise<UserRow | null>;
    findUserById(id: string): Promise<UserRow | null>;
    findRoleByName(name: UserRole): Promise<RoleRow | null>;
    getUserRoles(userId: string): Promise<UserRole[]>;
    userHasRole(userId: string, roleName: UserRole): Promise<boolean>;
    assignRoleToUser(userId: string, roleName: UserRole): Promise<void>;
    createUser(data: NewUserRow): Promise<UserRow>;
    createUserWithInitialRole(data: NewUserRow): Promise<{ user: UserRow; roles: UserRole[] }>;
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
