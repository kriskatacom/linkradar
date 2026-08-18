import type { AuthUser, PermissionName } from "./types";

export function hasPermission(
    user: AuthUser | null | undefined,
    permission: PermissionName,
): boolean {
    if (!user) {
        return false;
    }

    return user.permissions.includes(permission);
}

export function hasAnyPermission(
    user: AuthUser | null | undefined,
    permissions: PermissionName[],
): boolean {
    if (!user) {
        return false;
    }

    return permissions.some((permission) => user.permissions.includes(permission));
}
