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

    SCANS_VIEW: "scans.view",
    SCANS_CREATE: "scans.create",
    SCANS_CANCEL: "scans.cancel",
    SCANS_DELETE: "scans.delete",

    ISSUES_VIEW: "issues.view",

    REPORTS_VIEW: "reports.view",
    REPORTS_EXPORT: "reports.export",

    SETTINGS_VIEW: "settings.view",
    SETTINGS_UPDATE: "settings.update",
} as const;

export type SystemPermission = (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];

export const SYSTEM_PERMISSION_DEFINITIONS: Array<{
    name: SystemPermission;
    label: string;
    description: string;
}> = [
    {
        name: SYSTEM_PERMISSIONS.ADMIN_ACCESS,
        label: "Access administration",
        description: "Allows access to admin-only areas and endpoints.",
    },
    {
        name: SYSTEM_PERMISSIONS.USERS_VIEW,
        label: "View users",
        description: "Allows listing and viewing user profiles.",
    },
    {
        name: SYSTEM_PERMISSIONS.USERS_CREATE,
        label: "Create users",
        description: "Allows creating user accounts.",
    },
    {
        name: SYSTEM_PERMISSIONS.USERS_UPDATE,
        label: "Update users",
        description: "Allows editing existing user data.",
    },
    {
        name: SYSTEM_PERMISSIONS.USERS_DELETE,
        label: "Delete users",
        description: "Allows deleting users from the system.",
    },
    {
        name: SYSTEM_PERMISSIONS.USERS_ROLES_MANAGE,
        label: "Manage user roles",
        description: "Allows assigning and removing roles for users.",
    },
    {
        name: SYSTEM_PERMISSIONS.ROLES_VIEW,
        label: "View roles",
        description: "Allows viewing role definitions.",
    },
    {
        name: SYSTEM_PERMISSIONS.ROLES_CREATE,
        label: "Create roles",
        description: "Allows creating roles.",
    },
    {
        name: SYSTEM_PERMISSIONS.ROLES_UPDATE,
        label: "Update roles",
        description: "Allows editing roles.",
    },
    {
        name: SYSTEM_PERMISSIONS.ROLES_DELETE,
        label: "Delete roles",
        description: "Allows deleting roles.",
    },
    {
        name: SYSTEM_PERMISSIONS.ROLES_PERMISSIONS_MANAGE,
        label: "Manage role permissions",
        description: "Allows assigning permissions to roles.",
    },
    {
        name: SYSTEM_PERMISSIONS.SITES_VIEW,
        label: "View sites",
        description: "Allows viewing websites in accessible workspaces.",
    },
    {
        name: SYSTEM_PERMISSIONS.SITES_CREATE,
        label: "Create sites",
        description: "Allows adding websites for monitoring.",
    },
    {
        name: SYSTEM_PERMISSIONS.SITES_UPDATE,
        label: "Update sites",
        description: "Allows editing existing websites.",
    },
    {
        name: SYSTEM_PERMISSIONS.SITES_DELETE,
        label: "Delete sites",
        description: "Allows deleting websites.",
    },
    {
        name: SYSTEM_PERMISSIONS.SITES_SCAN,
        label: "Start site scans",
        description: "Allows starting a new scan for an accessible site.",
    },
    {
        name: SYSTEM_PERMISSIONS.SCANS_VIEW,
        label: "View scans",
        description: "Allows viewing scan history and status.",
    },
    {
        name: SYSTEM_PERMISSIONS.SCANS_CREATE,
        label: "Create scans",
        description: "Allows creating scan jobs.",
    },
    {
        name: SYSTEM_PERMISSIONS.SCANS_CANCEL,
        label: "Cancel scans",
        description: "Allows cancelling active scans.",
    },
    {
        name: SYSTEM_PERMISSIONS.SCANS_DELETE,
        label: "Delete scans",
        description: "Allows deleting scan records.",
    },
    {
        name: SYSTEM_PERMISSIONS.ISSUES_VIEW,
        label: "View issues",
        description: "Allows viewing detected issues.",
    },
    {
        name: SYSTEM_PERMISSIONS.REPORTS_VIEW,
        label: "View reports",
        description: "Allows viewing generated reports.",
    },
    {
        name: SYSTEM_PERMISSIONS.REPORTS_EXPORT,
        label: "Export reports",
        description: "Allows exporting reports.",
    },
    {
        name: SYSTEM_PERMISSIONS.SETTINGS_VIEW,
        label: "View settings",
        description: "Allows viewing system settings.",
    },
    {
        name: SYSTEM_PERMISSIONS.SETTINGS_UPDATE,
        label: "Update settings",
        description: "Allows updating system settings.",
    },
];

export const DEFAULT_USER_PERMISSIONS: SystemPermission[] = [
    SYSTEM_PERMISSIONS.SITES_VIEW,
    SYSTEM_PERMISSIONS.SITES_CREATE,
    SYSTEM_PERMISSIONS.SITES_UPDATE,
    SYSTEM_PERMISSIONS.SITES_DELETE,
    SYSTEM_PERMISSIONS.SITES_SCAN,
    SYSTEM_PERMISSIONS.SCANS_VIEW,
    SYSTEM_PERMISSIONS.SCANS_CREATE,
    SYSTEM_PERMISSIONS.SCANS_CANCEL,
    SYSTEM_PERMISSIONS.SCANS_DELETE,
    SYSTEM_PERMISSIONS.ISSUES_VIEW,
    SYSTEM_PERMISSIONS.REPORTS_VIEW,
    SYSTEM_PERMISSIONS.REPORTS_EXPORT,
];
