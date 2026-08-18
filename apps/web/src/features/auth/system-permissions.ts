export const SYSTEM_PERMISSIONS = {
    ADMIN_ACCESS: "admin.access",
    USERS_UPDATE: "users.update",
    USERS_ROLES_MANAGE: "users.roles.manage",
    SITES_VIEW: "sites.view",
    SITES_UPDATE: "sites.update",
} as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];
