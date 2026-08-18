import type {
    AuthSessionRow,
    NewAuthSessionRow,
    NewUserRow,
    PermissionName,
    PermissionRow,
    RoleRow,
    UserRole,
    UserRow,
} from "./auth.types.js";

export interface AuthRepository {
    ensureSystemRoles(): Promise<void>;
    ensureSystemPermissions(): Promise<void>;
    ensureDefaultRolePermissions(): Promise<void>;
    ensureRbacBootstrap(): Promise<void>;
    findUserByEmail(email: string): Promise<UserRow | null>;
    findUserById(id: string): Promise<UserRow | null>;
    findRoleByName(name: UserRole): Promise<RoleRow | null>;
    findPermissionByName(name: PermissionName): Promise<PermissionRow | null>;
    getPermissions(): Promise<PermissionRow[]>;
    getUserRoles(userId: string): Promise<UserRole[]>;
    getRolePermissions(roleId: string): Promise<PermissionName[]>;
    getUserPermissions(userId: string): Promise<PermissionName[]>;
    userHasRole(userId: string, roleName: UserRole): Promise<boolean>;
    roleHasPermission(roleId: string, permissionName: PermissionName): Promise<boolean>;
    userHasPermission(userId: string, permissionName: PermissionName): Promise<boolean>;
    assignRoleToUser(userId: string, roleName: UserRole): Promise<void>;
    assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;
    removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
    createUser(data: NewUserRow): Promise<UserRow>;
    createUserWithInitialRole(data: NewUserRow): Promise<{
        user: UserRow;
        roles: UserRole[];
        permissions: PermissionName[];
    }>;
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
