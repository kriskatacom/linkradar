import { randomUUID } from "node:crypto";

import type { PermissionName, RoleRow, UserRole, UserRow } from "../src/modules/auth/auth.types.js";
import type { AdminRepository } from "../src/modules/admin/admin.repository.js";
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
} from "../src/modules/admin/admin.types.js";
import { MemoryAuthRepository } from "./memory-auth.repository.js";
import { MemoryWorkspaceRepository } from "./memory-workspace.repository.js";

function mapUser(row: UserRow, roles: UserRole[]): AdminUserListItem {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerifiedAt !== null,
        isActive: row.isActive,
        deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
        roles,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export class MemoryAdminRepository implements AdminRepository {
    constructor(private readonly authRepository: MemoryAuthRepository) {}

    async listUsers(query: ListUsersQuery): Promise<PaginatedResult<AdminUserListItem>> {
        let rows = [...this.authRepository.users.values()];

        if (query.search) {
            const term = query.search.toLowerCase();
            rows = rows.filter(
                (user) =>
                    user.name.toLowerCase().includes(term) ||
                    user.email.toLowerCase().includes(term),
            );
        }

        switch (query.status) {
            case "active":
                rows = rows.filter((user) => user.deletedAt === null && user.isActive);
                break;
            case "inactive":
                rows = rows.filter((user) => user.deletedAt === null && !user.isActive);
                break;
            case "deleted":
                rows = rows.filter((user) => user.deletedAt !== null);
                break;
            case "all":
                break;
            default:
                rows = rows.filter((user) => user.deletedAt === null);
                break;
        }

        if (query.role) {
            rows = rows.filter((user) => {
                const roles = this.authRepository.userRoles.get(user.id);
                return roles ? roles.has(query.role as UserRole) : false;
            });
        }

        rows.sort((a, b) => {
            const direction = query.direction === "asc" ? 1 : -1;
            const left =
                query.sort === "email"
                    ? a.email
                    : query.sort === "name"
                      ? a.name
                      : query.sort === "updatedAt"
                        ? a.updatedAt.toISOString()
                        : a.createdAt.toISOString();
            const right =
                query.sort === "email"
                    ? b.email
                    : query.sort === "name"
                      ? b.name
                      : query.sort === "updatedAt"
                        ? b.updatedAt.toISOString()
                        : b.createdAt.toISOString();
            return left.localeCompare(right) * direction;
        });

        const total = rows.length;
        const start = (query.page - 1) * query.perPage;
        const pageRows = rows.slice(start, start + query.perPage);
        const items = await Promise.all(
            pageRows.map(async (row) => mapUser(row, await this.authRepository.getUserRoles(row.id))),
        );

        return {
            items,
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / query.perPage),
            },
        };
    }

    async findUserById(id: string): Promise<AdminUserDetail | null> {
        const row = await this.findUserRowById(id);
        if (!row) {
            return null;
        }
        return mapUser(row, await this.authRepository.getUserRoles(id));
    }

    async findUserRowById(id: string): Promise<UserRow | null> {
        return this.authRepository.findUserById(id);
    }

    async updateUser(
        id: string,
        data: { name?: string; isActive?: boolean },
    ): Promise<AdminUserDetail> {
        const user = this.authRepository.users.get(id);
        if (!user) {
            throw new Error("User not found");
        }
        this.authRepository.users.set(id, {
            ...user,
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            updatedAt: new Date(),
        });
        return (await this.findUserById(id)) as AdminUserDetail;
    }

    async softDeleteUser(id: string): Promise<AdminUserDetail> {
        const user = this.authRepository.users.get(id);
        if (!user) {
            throw new Error("User not found");
        }
        this.authRepository.users.set(id, { ...user, deletedAt: new Date(), updatedAt: new Date() });
        return (await this.findUserById(id)) as AdminUserDetail;
    }

    async restoreUser(id: string): Promise<AdminUserDetail> {
        const user = this.authRepository.users.get(id);
        if (!user) {
            throw new Error("User not found");
        }
        this.authRepository.users.set(id, { ...user, deletedAt: null, updatedAt: new Date() });
        return (await this.findUserById(id)) as AdminUserDetail;
    }

    async activateUser(id: string): Promise<AdminUserDetail> {
        return this.updateUser(id, { isActive: true });
    }

    async deactivateUser(id: string): Promise<AdminUserDetail> {
        return this.updateUser(id, { isActive: false });
    }

    async syncUserRoles(userId: string, roleNames: UserRole[]): Promise<AdminUserDetail> {
        this.authRepository.userRoles.set(userId, new Set(roleNames));
        return (await this.findUserById(userId)) as AdminUserDetail;
    }

    async countActiveAdminUsers(excludeUserId?: string): Promise<number> {
        let count = 0;
        for (const user of this.authRepository.users.values()) {
            if (user.deletedAt !== null || !user.isActive) {
                continue;
            }
            if (excludeUserId && user.id === excludeUserId) {
                continue;
            }
            const roles = this.authRepository.userRoles.get(user.id);
            if (roles?.has("admin")) {
                count += 1;
            }
        }
        return count;
    }

    async isActiveAdminUser(userId: string): Promise<boolean> {
        const user = this.authRepository.users.get(userId);
        if (!user || user.deletedAt !== null || !user.isActive) {
            return false;
        }
        return this.authRepository.userRoles.get(userId)?.has("admin") ?? false;
    }

    async listRoles(query: ListRolesQuery): Promise<PaginatedResult<AdminRoleListItem>> {
        let rows = [...this.authRepository.roles.values()];
        if (query.search) {
            const term = query.search.toLowerCase();
            rows = rows.filter(
                (role) =>
                    role.name.toLowerCase().includes(term) ||
                    role.label.toLowerCase().includes(term),
            );
        }

        rows.sort((a, b) => {
            const direction = query.direction === "asc" ? 1 : -1;
            const left =
                query.sort === "label"
                    ? a.label
                    : query.sort === "createdAt"
                      ? a.createdAt.toISOString()
                      : a.name;
            const right =
                query.sort === "label"
                    ? b.label
                    : query.sort === "createdAt"
                      ? b.createdAt.toISOString()
                      : b.name;
            return left.localeCompare(right) * direction;
        });

        const total = rows.length;
        const start = (query.page - 1) * query.perPage;
        const pageRows = rows.slice(start, start + query.perPage);
        const items = await Promise.all(pageRows.map((row) => this.mapRoleListItem(row)));

        return {
            items,
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / query.perPage),
            },
        };
    }

    async findRoleById(id: string): Promise<AdminRoleDetail | null> {
        const role = [...this.authRepository.roles.values()].find((item) => item.id === id);
        if (!role) {
            return null;
        }

        const permissions = await this.getRolePermissionNames(role.id);
        const usersCount = await this.countUsersWithRole(role.id);

        return {
            id: role.id,
            name: role.name,
            label: role.label,
            isSystem: role.isSystem,
            permissions,
            usersCount,
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString(),
        };
    }

    async findRoleByName(name: string): Promise<RoleRow | null> {
        return this.authRepository.findRoleByName(name);
    }

    async createRole(data: { name: string; label: string }): Promise<AdminRoleDetail> {
        const id = randomUUID();
        const now = new Date();
        this.authRepository.roles.set(data.name, {
            id,
            name: data.name,
            label: data.label,
            isSystem: false,
            createdAt: now,
            updatedAt: now,
        });
        return (await this.findRoleById(id)) as AdminRoleDetail;
    }

    async updateRole(id: string, data: { label: string }): Promise<AdminRoleDetail> {
        const role = [...this.authRepository.roles.values()].find((item) => item.id === id);
        if (!role) {
            throw new Error("Role not found");
        }
        this.authRepository.roles.set(role.name, { ...role, label: data.label, updatedAt: new Date() });
        return (await this.findRoleById(id)) as AdminRoleDetail;
    }

    async deleteRole(id: string): Promise<void> {
        const role = [...this.authRepository.roles.values()].find((item) => item.id === id);
        if (!role) {
            return;
        }
        this.authRepository.roles.delete(role.name);
        this.authRepository.rolePermissions.delete(id);
    }

    async syncRolePermissions(
        roleId: string,
        permissionNames: PermissionName[],
    ): Promise<AdminRoleDetail> {
        const permissionIds = permissionNames
            .map((name) => this.authRepository.permissions.get(name)?.id)
            .filter((id): id is string => Boolean(id));
        this.authRepository.rolePermissions.set(roleId, new Set(permissionIds));
        return (await this.findRoleById(roleId)) as AdminRoleDetail;
    }

    async countUsersWithRole(roleId: string): Promise<number> {
        const role = [...this.authRepository.roles.values()].find((item) => item.id === roleId);
        if (!role) {
            return 0;
        }

        let count = 0;
        for (const [userId, roles] of this.authRepository.userRoles) {
            if (roles.has(role.name)) {
                count += 1;
            }
        }
        return count;
    }

    async listPermissions(): Promise<AdminPermissionItem[]> {
        const items: AdminPermissionItem[] = [];
        for (const permission of this.authRepository.permissions.values()) {
            const usedByRoles: string[] = [];
            for (const [roleId, permissionIds] of this.authRepository.rolePermissions) {
                if (permissionIds.has(permission.id)) {
                    const role = [...this.authRepository.roles.values()].find(
                        (item) => item.id === roleId,
                    );
                    if (role) {
                        usedByRoles.push(role.name);
                    }
                }
            }
            items.push({
                id: permission.id,
                name: permission.name,
                label: permission.label,
                description: permission.description,
                usedByRoles,
            });
        }
        return items.sort((a, b) => a.name.localeCompare(b.name));
    }

    async getStats(): Promise<AdminStats> {
        const users = this.authRepository.users.size;
        const roles = this.authRepository.roles.size;
        const permissions = this.authRepository.permissions.size;
        const activeUsers = [...this.authRepository.users.values()].filter(
            (user) => user.deletedAt === null && user.isActive,
        ).length;

        return { users, roles, permissions, activeUsers };
    }

    async deleteSessionsForUser(userId: string): Promise<number> {
        return this.authRepository.deleteSessionsForUser(userId);
    }

    async getAllRoles(): Promise<RoleRow[]> {
        return [...this.authRepository.roles.values()];
    }

    async getPermissionsByNames(names: PermissionName[]): Promise<PermissionName[]> {
        return names.filter((name) => this.authRepository.permissions.has(name));
    }

    private async mapRoleListItem(role: RoleRow): Promise<AdminRoleListItem> {
        const permissionIds = this.authRepository.rolePermissions.get(role.id) ?? new Set<string>();
        return {
            id: role.id,
            name: role.name,
            label: role.label,
            isSystem: role.isSystem,
            permissionsCount: permissionIds.size,
            usersCount: await this.countUsersWithRole(role.id),
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString(),
        };
    }

    private async getRolePermissionNames(roleId: string): Promise<PermissionName[]> {
        const permissionIds = this.authRepository.rolePermissions.get(roleId) ?? new Set<string>();
        const names: PermissionName[] = [];
        for (const permission of this.authRepository.permissions.values()) {
            if (permissionIds.has(permission.id)) {
                names.push(permission.name);
            }
        }
        return names.sort();
    }
}

export function createTestRepositories() {
    const repository = new MemoryAuthRepository();
    const adminRepository = new MemoryAdminRepository(repository);
    const workspaceRepository = new MemoryWorkspaceRepository(
        repository.workspaceStore,
        repository,
    );
    return { repository, adminRepository, workspaceRepository };
}
