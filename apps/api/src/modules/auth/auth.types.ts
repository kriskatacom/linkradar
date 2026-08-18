import type { authSessions, permissions, roles, users } from "@link-radar/database";
import type { SystemPermission } from "./rbac/system-permissions.js";

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type NewAuthSessionRow = typeof authSessions.$inferInsert;
export type RoleRow = typeof roles.$inferSelect;
export type PermissionRow = typeof permissions.$inferSelect;

export type UserRole = "admin" | "user" | string;
export type PermissionName = SystemPermission | string;
export type ThemePreference = "light" | "dark" | "system";

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function parseThemePreference(value: unknown): ThemePreference {
    return value === "light" || value === "dark" || value === "system"
        ? value
        : DEFAULT_THEME_PREFERENCE;
}

export type AuthenticatedUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    theme: ThemePreference;
    roles: UserRole[];
    permissions: PermissionName[];
};

export type AccessTokenPayload = {
    sub: string;
    sessionId: string;
};

export type AuthTokensResult = {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken: string;
};

export type RequestContext = {
    userAgent: string | null;
    ipAddress: string | null;
};

export type SuccessResponse<T> = {
    success: true;
    data: T;
};

export type ErrorResponse = {
    success: false;
    error: {
        code: string;
        message: string;
        fields?: Record<string, string[]>;
    };
};

export function toAuthenticatedUser(
    user: UserRow,
    roles: UserRole[],
    permissions: PermissionName[],
): AuthenticatedUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerifiedAt !== null,
        theme: parseThemePreference(user.theme),
        roles,
        permissions,
    };
}
