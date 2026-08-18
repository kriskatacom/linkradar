import type { AuthUser, UserRole } from "./types";

export function hasRole(user: AuthUser | null | undefined, role: UserRole): boolean {
    if (!user) {
        return false;
    }

    return user.roles.includes(role);
}
