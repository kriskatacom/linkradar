import type { PermissionName, UserRole } from "../auth/auth.types.js";

export type PaginationMeta = {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
};

export type PaginatedResult<T> = {
    items: T[];
    pagination: PaginationMeta;
};

export type AdminUserListItem = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    isActive: boolean;
    deletedAt: string | null;
    roles: UserRole[];
    createdAt: string;
    updatedAt: string;
};

export type AdminUserDetail = AdminUserListItem;

export type AdminRoleListItem = {
    id: string;
    name: string;
    label: string;
    isSystem: boolean;
    permissionsCount: number;
    usersCount: number;
    createdAt: string;
    updatedAt: string;
};

export type AdminRoleDetail = {
    id: string;
    name: string;
    label: string;
    isSystem: boolean;
    permissions: PermissionName[];
    usersCount: number;
    createdAt: string;
    updatedAt: string;
};

export type AdminPermissionItem = {
    id: string;
    name: PermissionName;
    label: string;
    description: string | null;
    usedByRoles: string[];
};

export type AdminStats = {
    users: number;
    roles: number;
    permissions: number;
    activeUsers: number;
};

export type ListUsersQuery = {
    page: number;
    perPage: number;
    search?: string;
    status?: "active" | "inactive" | "deleted" | "all";
    role?: string;
    sort: "name" | "email" | "createdAt" | "updatedAt";
    direction: "asc" | "desc";
};

export type ListRolesQuery = {
    page: number;
    perPage: number;
    search?: string;
    sort: "name" | "label" | "createdAt";
    direction: "asc" | "desc";
};
