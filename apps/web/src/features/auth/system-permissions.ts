export const SYSTEM_PERMISSIONS = {
    ADMIN_ACCESS: "admin.access",
    USERS_VIEW: "users.view",
    USERS_CREATE: "users.create",
    USERS_UPDATE: "users.update",
    USERS_DELETE: "users.delete",
    USERS_ROLES_MANAGE: "users.roles.manage",
    ROLES_VIEW: "roles.view",
    ROLES_CREATE: "roles.create",
    ROLES_UPDATE: "roles.update",
    ROLES_DELETE: "roles.delete",
    ROLES_PERMISSIONS_MANAGE: "roles.permissions.manage",
    SITES_VIEW: "sites.view",
    SITES_CREATE: "sites.create",
    SITES_UPDATE: "sites.update",
    SITES_DELETE: "sites.delete",
    SITES_SCAN: "sites.scan",
} as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];

export function groupPermissionsByResource(permissions: Array<{ name: string; label: string; description: string | null }>) {
    const groups = new Map<string, Array<{ name: string; label: string; description: string | null }>>();

    for (const permission of permissions) {
        const [resource] = permission.name.split(".");
        const label = resource.charAt(0).toUpperCase() + resource.slice(1);
        const current = groups.get(label) ?? [];
        current.push(permission);
        groups.set(label, current);
    }

    return [...groups.entries()].map(([group, items]) => ({ group, items }));
}
