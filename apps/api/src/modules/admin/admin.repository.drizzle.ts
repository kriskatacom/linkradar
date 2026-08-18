import {
    db,
    permissions,
    rolePermissions,
    roles,
    userRoles,
    users,
} from "@link-radar/database";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { validationError } from "../auth/auth.errors.js";
import { duplicateRoleNameError } from "./admin.errors.js";
import type { PermissionName, RoleRow, UserRole, UserRow } from "../auth/auth.types.js";
import { notFoundError } from "./admin.errors.js";
import type { AdminRepository } from "./admin.repository.js";
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

function isDuplicateEntry(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "errno" in error &&
        (error as { errno: number }).errno === 1062
    );
}

function toIso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
}

function mapUser(row: UserRow, userRoleNames: UserRole[]): AdminUserListItem {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerifiedAt !== null,
        isActive: row.isActive,
        deletedAt: toIso(row.deletedAt),
        roles: userRoleNames,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export class DrizzleAdminRepository implements AdminRepository {
    async listUsers(query: ListUsersQuery): Promise<PaginatedResult<AdminUserListItem>> {
        const conditions = this.buildUserConditions(query);
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const orderColumn =
            query.sort === "email"
                ? users.email
                : query.sort === "createdAt"
                  ? users.createdAt
                  : query.sort === "updatedAt"
                    ? users.updatedAt
                    : users.name;
        const orderBy = query.direction === "desc" ? desc(orderColumn) : asc(orderColumn);
        const offset = (query.page - 1) * query.perPage;

        let userIds: string[] | undefined;
        if (query.role) {
            const role = await this.findRoleByName(query.role);
            if (!role) {
                return {
                    items: [],
                    pagination: {
                        page: query.page,
                        perPage: query.perPage,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }

            const roleUserRows = await db
                .select({ userId: userRoles.userId })
                .from(userRoles)
                .where(eq(userRoles.roleId, role.id));
            userIds = roleUserRows.map((row) => row.userId);
            if (userIds.length === 0) {
                return {
                    items: [],
                    pagination: {
                        page: query.page,
                        perPage: query.perPage,
                        total: 0,
                        totalPages: 0,
                    },
                };
            }
        }

        const finalWhere =
            userIds !== undefined
                ? and(whereClause, inArray(users.id, userIds))
                : whereClause;

        const [totalRow] = await db.select({ value: count() }).from(users).where(finalWhere);
        const total = Number(totalRow?.value ?? 0);

        const rows = await db
            .select()
            .from(users)
            .where(finalWhere)
            .orderBy(orderBy)
            .limit(query.perPage)
            .offset(offset);

        const items = await Promise.all(
            rows.map(async (row) => mapUser(row, await this.getUserRoleNames(row.id))),
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

        return mapUser(row, await this.getUserRoleNames(id));
    }

    async findUserRowById(id: string): Promise<UserRow | null> {
        const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return rows[0] ?? null;
    }

    async updateUser(
        id: string,
        data: { name?: string; isActive?: boolean },
    ): Promise<AdminUserDetail> {
        await db
            .update(users)
            .set({
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            })
            .where(eq(users.id, id));

        const updated = await this.findUserById(id);
        if (!updated) {
            throw notFoundError("User");
        }

        return updated;
    }

    async softDeleteUser(id: string): Promise<AdminUserDetail> {
        await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
        const updated = await this.findUserById(id);
        if (!updated) {
            throw notFoundError("User");
        }
        return updated;
    }

    async restoreUser(id: string): Promise<AdminUserDetail> {
        await db.update(users).set({ deletedAt: null }).where(eq(users.id, id));
        const updated = await this.findUserById(id);
        if (!updated) {
            throw notFoundError("User");
        }
        return updated;
    }

    async activateUser(id: string): Promise<AdminUserDetail> {
        return this.updateUser(id, { isActive: true });
    }

    async deactivateUser(id: string): Promise<AdminUserDetail> {
        return this.updateUser(id, { isActive: false });
    }

    async syncUserRoles(userId: string, roleNames: UserRole[]): Promise<AdminUserDetail> {
        return db.transaction(async (tx) => {
            const uniqueRoleNames = [...new Set(roleNames)];
            const roleRows =
                uniqueRoleNames.length > 0
                    ? await tx.select().from(roles).where(inArray(roles.name, uniqueRoleNames))
                    : [];

            if (roleRows.length !== uniqueRoleNames.length) {
                throw validationError({
                    roles: ["One or more roles do not exist."],
                });
            }

            await tx.delete(userRoles).where(eq(userRoles.userId, userId));

            for (const role of roleRows) {
                await tx.insert(userRoles).values({
                    userId,
                    roleId: role.id,
                });
            }

            const user = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
            if (!user[0]) {
                throw notFoundError("User");
            }

            const assignedRoles = await this.getUserRoleNamesTx(tx, userId);
            return mapUser(user[0], assignedRoles);
        });
    }

    async countActiveAdminUsers(excludeUserId?: string): Promise<number> {
        const adminRole = await this.findRoleByName("admin");
        if (!adminRole) {
            return 0;
        }

        const conditions = [
            eq(userRoles.roleId, adminRole.id),
            eq(users.isActive, true),
            isNull(users.deletedAt),
        ];
        if (excludeUserId) {
            conditions.push(sql`${users.id} <> ${excludeUserId}`);
        }

        const [row] = await db
            .select({ value: count() })
            .from(userRoles)
            .innerJoin(users, eq(users.id, userRoles.userId))
            .where(and(...conditions));

        return Number(row?.value ?? 0);
    }

    async isActiveAdminUser(userId: string): Promise<boolean> {
        const adminRole = await this.findRoleByName("admin");
        if (!adminRole) {
            return false;
        }

        const user = await this.findUserRowById(userId);
        if (!user || user.deletedAt !== null || !user.isActive) {
            return false;
        }

        const rows = await db
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, adminRole.id)))
            .limit(1);

        return rows.length > 0;
    }

    async listRoles(query: ListRolesQuery): Promise<PaginatedResult<AdminRoleListItem>> {
        const conditions = [];
        if (query.search) {
            const term = `%${query.search}%`;
            conditions.push(or(like(roles.name, term), like(roles.label, term)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
        const orderColumn =
            query.sort === "label"
                ? roles.label
                : query.sort === "createdAt"
                  ? roles.createdAt
                  : roles.name;
        const orderBy = query.direction === "desc" ? desc(orderColumn) : asc(orderColumn);
        const offset = (query.page - 1) * query.perPage;

        const [totalRow] = await db.select({ value: count() }).from(roles).where(whereClause);
        const total = Number(totalRow?.value ?? 0);

        const rows = await db
            .select()
            .from(roles)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(query.perPage)
            .offset(offset);

        const items = await Promise.all(rows.map((row) => this.mapRoleListItem(row)));

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
        const rows = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
        const role = rows[0];
        if (!role) {
            return null;
        }

        const permissionNames = await this.getRolePermissionNames(role.id);
        const usersCount = await this.countUsersWithRole(role.id);

        return {
            id: role.id,
            name: role.name,
            label: role.label,
            isSystem: role.isSystem,
            permissions: permissionNames,
            usersCount,
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString(),
        };
    }

    async findRoleByName(name: string): Promise<RoleRow | null> {
        const rows = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
        return rows[0] ?? null;
    }

    async createRole(data: { name: string; label: string }): Promise<AdminRoleDetail> {
        const id = randomUUID();
        try {
            await db.insert(roles).values({
                id,
                name: data.name,
                label: data.label,
                isSystem: false,
            });
        } catch (error) {
            if (isDuplicateEntry(error)) {
                throw duplicateRoleNameError();
            }
            throw error;
        }

        const created = await this.findRoleById(id);
        if (!created) {
            throw notFoundError("Role");
        }
        return created;
    }

    async updateRole(id: string, data: { label: string }): Promise<AdminRoleDetail> {
        await db.update(roles).set({ label: data.label }).where(eq(roles.id, id));
        const updated = await this.findRoleById(id);
        if (!updated) {
            throw notFoundError("Role");
        }
        return updated;
    }

    async deleteRole(id: string): Promise<void> {
        await db.delete(roles).where(eq(roles.id, id));
    }

    async syncRolePermissions(
        roleId: string,
        permissionNames: PermissionName[],
    ): Promise<AdminRoleDetail> {
        return db.transaction(async (tx) => {
            const uniqueNames = [...new Set(permissionNames)];
            const permissionRows =
                uniqueNames.length > 0
                    ? await tx
                          .select()
                          .from(permissions)
                          .where(inArray(permissions.name, uniqueNames))
                    : [];

            if (permissionRows.length !== uniqueNames.length) {
                throw notFoundError("Permission");
            }

            await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

            for (const permission of permissionRows) {
                await tx.insert(rolePermissions).values({
                    roleId,
                    permissionId: permission.id,
                });
            }

            const role = await tx.select().from(roles).where(eq(roles.id, roleId)).limit(1);
            if (!role[0]) {
                throw notFoundError("Role");
            }

            const assignedPermissions = await tx
                .select({ name: permissions.name })
                .from(rolePermissions)
                .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
                .where(eq(rolePermissions.roleId, roleId));

            const usersCount = await this.countUsersWithRoleTx(tx, roleId);

            return {
                id: role[0].id,
                name: role[0].name,
                label: role[0].label,
                isSystem: role[0].isSystem,
                permissions: assignedPermissions.map((row) => row.name),
                usersCount,
                createdAt: role[0].createdAt.toISOString(),
                updatedAt: role[0].updatedAt.toISOString(),
            };
        });
    }

    async countUsersWithRole(roleId: string): Promise<number> {
        const [row] = await db
            .select({ value: count() })
            .from(userRoles)
            .where(eq(userRoles.roleId, roleId));
        return Number(row?.value ?? 0);
    }

    async listPermissions(): Promise<AdminPermissionItem[]> {
        const permissionRows = await db.select().from(permissions).orderBy(asc(permissions.name));
        const rolePermissionRows = await db
            .select({
                permissionId: rolePermissions.permissionId,
                roleName: roles.name,
            })
            .from(rolePermissions)
            .innerJoin(roles, eq(roles.id, rolePermissions.roleId));

        const usage = new Map<string, string[]>();
        for (const row of rolePermissionRows) {
            const current = usage.get(row.permissionId) ?? [];
            current.push(row.roleName);
            usage.set(row.permissionId, current);
        }

        return permissionRows.map((permission) => ({
            id: permission.id,
            name: permission.name,
            label: permission.label,
            description: permission.description,
            usedByRoles: usage.get(permission.id) ?? [],
        }));
    }

    async getStats(): Promise<AdminStats> {
        const [[usersCount], [rolesCount], [permissionsCount], [activeUsersCount]] =
            await Promise.all([
                db.select({ value: count() }).from(users),
                db.select({ value: count() }).from(roles),
                db.select({ value: count() }).from(permissions),
                db
                    .select({ value: count() })
                    .from(users)
                    .where(and(eq(users.isActive, true), isNull(users.deletedAt))),
            ]);

        return {
            users: Number(usersCount?.value ?? 0),
            roles: Number(rolesCount?.value ?? 0),
            permissions: Number(permissionsCount?.value ?? 0),
            activeUsers: Number(activeUsersCount?.value ?? 0),
        };
    }

    async deleteSessionsForUser(userId: string): Promise<number> {
        const { authSessions } = await import("@link-radar/database");
        const result = await db.delete(authSessions).where(eq(authSessions.userId, userId));
        return this.getAffectedRows(result);
    }

    async getAllRoles(): Promise<RoleRow[]> {
        return db.select().from(roles).orderBy(asc(roles.name));
    }

    async getPermissionsByNames(names: PermissionName[]): Promise<PermissionName[]> {
        if (names.length === 0) {
            return [];
        }

        const rows = await db
            .select({ name: permissions.name })
            .from(permissions)
            .where(inArray(permissions.name, names));

        return rows.map((row) => row.name);
    }

    private buildUserConditions(query: ListUsersQuery) {
        const conditions = [];

        if (query.search) {
            const term = `%${query.search}%`;
            conditions.push(or(like(users.name, term), like(users.email, term)));
        }

        switch (query.status) {
            case "active":
                conditions.push(and(isNull(users.deletedAt), eq(users.isActive, true)));
                break;
            case "inactive":
                conditions.push(and(isNull(users.deletedAt), eq(users.isActive, false)));
                break;
            case "deleted":
                conditions.push(isNotNull(users.deletedAt));
                break;
            case "all":
                break;
            default:
                conditions.push(isNull(users.deletedAt));
                break;
        }

        return conditions;
    }

    private async getUserRoleNames(userId: string): Promise<UserRole[]> {
        const rows = await db
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.roleName);
    }

    private async getUserRoleNamesTx(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        userId: string,
    ): Promise<UserRole[]> {
        const rows = await tx
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.roleName);
    }

    private async getRolePermissionNames(roleId: string): Promise<PermissionName[]> {
        const rows = await db
            .select({ name: permissions.name })
            .from(rolePermissions)
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(eq(rolePermissions.roleId, roleId));

        return rows.map((row) => row.name);
    }

    private async mapRoleListItem(role: RoleRow): Promise<AdminRoleListItem> {
        const [permissionsCount, usersCount] = await Promise.all([
            this.countRolePermissions(role.id),
            this.countUsersWithRole(role.id),
        ]);

        return {
            id: role.id,
            name: role.name,
            label: role.label,
            isSystem: role.isSystem,
            permissionsCount,
            usersCount,
            createdAt: role.createdAt.toISOString(),
            updatedAt: role.updatedAt.toISOString(),
        };
    }

    private async countRolePermissions(roleId: string): Promise<number> {
        const [row] = await db
            .select({ value: count() })
            .from(rolePermissions)
            .where(eq(rolePermissions.roleId, roleId));
        return Number(row?.value ?? 0);
    }

    private async countUsersWithRoleTx(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        roleId: string,
    ): Promise<number> {
        const [row] = await tx
            .select({ value: count() })
            .from(userRoles)
            .where(eq(userRoles.roleId, roleId));
        return Number(row?.value ?? 0);
    }

    private getAffectedRows(result: unknown): number {
        if (
            Array.isArray(result) &&
            result[0] &&
            typeof result[0] === "object" &&
            "affectedRows" in result[0]
        ) {
            return Number((result[0] as { affectedRows: number }).affectedRows);
        }

        if (typeof result === "object" && result !== null && "affectedRows" in result) {
            return Number((result as { affectedRows: number }).affectedRows);
        }

        return 0;
    }
}
