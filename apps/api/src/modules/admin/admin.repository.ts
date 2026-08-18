import type { PermissionName, RoleRow, UserRole, UserRow } from "../auth/auth.types.js";
import type {
    AdminPermissionItem,
    AdminRoleDetail,
    AdminRoleListItem,
    AdminStats,
    AdminUserDetail,
    AdminUserListItem,
    ListRolesQuery,
    ListUsersQuery,
    PaginatedResult,
} from "./admin.types.js";

export interface AdminRepository {
    listUsers(query: ListUsersQuery): Promise<PaginatedResult<AdminUserListItem>>;
    findUserById(id: string): Promise<AdminUserDetail | null>;
    updateUser(id: string, data: { name?: string; isActive?: boolean }): Promise<AdminUserDetail>;
    softDeleteUser(id: string): Promise<AdminUserDetail>;
    restoreUser(id: string): Promise<AdminUserDetail>;
    activateUser(id: string): Promise<AdminUserDetail>;
    deactivateUser(id: string): Promise<AdminUserDetail>;
    syncUserRoles(userId: string, roleNames: UserRole[]): Promise<AdminUserDetail>;
    countActiveAdminUsers(excludeUserId?: string): Promise<number>;
    isActiveAdminUser(userId: string): Promise<boolean>;

    listRoles(query: ListRolesQuery): Promise<PaginatedResult<AdminRoleListItem>>;
    findRoleById(id: string): Promise<AdminRoleDetail | null>;
    findRoleByName(name: string): Promise<RoleRow | null>;
    createRole(data: { name: string; label: string }): Promise<AdminRoleDetail>;
    updateRole(id: string, data: { label: string }): Promise<AdminRoleDetail>;
    deleteRole(id: string): Promise<void>;
    syncRolePermissions(roleId: string, permissionNames: PermissionName[]): Promise<AdminRoleDetail>;
    countUsersWithRole(roleId: string): Promise<number>;

    listPermissions(): Promise<AdminPermissionItem[]>;
    getStats(): Promise<AdminStats>;

    deleteSessionsForUser(userId: string): Promise<number>;
    getAllRoles(): Promise<RoleRow[]>;
    getPermissionsByNames(names: PermissionName[]): Promise<PermissionName[]>;
    findUserRowById(id: string): Promise<UserRow | null>;
}
