import {
    authSessions,
    db,
    permissions,
    rolePermissions,
    roles,
    systemState,
    userRoles,
    users,
} from "@link-radar/database";
import { and, eq, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { emailAlreadyExistsError } from "./auth.errors.js";
import type { AuthRepository } from "./auth.repository.js";
import { insertPersonalWorkspaceTx } from "../workspaces/workspace.provision.js";
import type {
    AuthSessionRow,
    NewAuthSessionRow,
    NewUserRow,
    PermissionName,
    PermissionRow,
    RoleRow,
    ThemePreference,
    UserRole,
    UserRow,
} from "./auth.types.js";
import {
    DEFAULT_USER_PERMISSIONS,
    SYSTEM_PERMISSION_DEFINITIONS,
} from "./rbac/system-permissions.js";

function isDuplicateEntry(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "errno" in error &&
        (error as { errno: number }).errno === 1062
    );
}

function getAffectedRows(result: unknown): number {
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

const SYSTEM_ROLE_DEFINITIONS: Array<{ name: UserRole; label: string; isSystem: boolean }> = [
    { name: "admin", label: "Administrator", isSystem: true },
    { name: "user", label: "User", isSystem: true },
];
const INITIAL_ADMIN_MARKER_KEY = "initial_admin_user_id";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleAuthRepository implements AuthRepository {
    async ensureSystemRoles(): Promise<void> {
        await db.transaction(async (tx) => {
            await this.ensureSystemRolesTx(tx);
        });
    }

    async ensureSystemPermissions(): Promise<void> {
        await db.transaction(async (tx) => {
            await this.ensureSystemPermissionsTx(tx);
        });
    }

    async ensureDefaultRolePermissions(): Promise<void> {
        await db.transaction(async (tx) => {
            await this.ensureDefaultRolePermissionsTx(tx);
        });
    }

    async ensureRbacBootstrap(): Promise<void> {
        await db.transaction(async (tx) => {
            await this.ensureRbacBootstrapTx(tx);
        });
    }

    async findUserByEmail(email: string): Promise<UserRow | null> {
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return rows[0] ?? null;
    }

    async findUserById(id: string): Promise<UserRow | null> {
        const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return rows[0] ?? null;
    }

    async findRoleByName(name: UserRole): Promise<RoleRow | null> {
        const rows = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
        return rows[0] ?? null;
    }

    async findPermissionByName(name: PermissionName): Promise<PermissionRow | null> {
        const rows = await db.select().from(permissions).where(eq(permissions.name, name)).limit(1);
        return rows[0] ?? null;
    }

    async getPermissions(): Promise<PermissionRow[]> {
        return db.select().from(permissions);
    }

    async getUserRoles(userId: string): Promise<UserRole[]> {
        const rows = await db
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.roleName as UserRole);
    }

    async getRolePermissions(roleId: string): Promise<PermissionName[]> {
        const rows = await db
            .select({ permissionName: permissions.name })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(eq(rolePermissions.roleId, roleId));

        return rows.map((row) => row.permissionName);
    }

    async getUserPermissions(userId: string): Promise<PermissionName[]> {
        const rows = await db
            .selectDistinct({ permissionName: permissions.name })
            .from(userRoles)
            .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.permissionName);
    }

    async userHasRole(userId: string, roleName: UserRole): Promise<boolean> {
        const role = await this.findRoleByName(roleName);
        if (!role) {
            return false;
        }

        const rows = await db
            .select({ userId: userRoles.userId })
            .from(userRoles)
            .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
            .limit(1);

        return rows.length > 0;
    }

    async roleHasPermission(roleId: string, permissionName: PermissionName): Promise<boolean> {
        const permission = await this.findPermissionByName(permissionName);
        if (!permission) {
            return false;
        }

        const rows = await db
            .select({ roleId: rolePermissions.roleId })
            .from(rolePermissions)
            .where(
                and(
                    eq(rolePermissions.roleId, roleId),
                    eq(rolePermissions.permissionId, permission.id),
                ),
            )
            .limit(1);

        return rows.length > 0;
    }

    async userHasPermission(userId: string, permissionName: PermissionName): Promise<boolean> {
        const rows = await db
            .select({ permissionId: permissions.id })
            .from(userRoles)
            .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(and(eq(userRoles.userId, userId), eq(permissions.name, permissionName)))
            .limit(1);

        return rows.length > 0;
    }

    async assignRoleToUser(userId: string, roleName: UserRole): Promise<void> {
        const role = await this.findRoleByName(roleName);
        if (!role) {
            throw new Error(`Role ${roleName} does not exist.`);
        }

        try {
            await db.insert(userRoles).values({
                userId,
                roleId: role.id,
            });
        } catch (error) {
            if (isDuplicateEntry(error)) {
                return;
            }
            throw error;
        }
    }

    async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
        try {
            await db.insert(rolePermissions).values({
                roleId,
                permissionId,
            });
        } catch (error) {
            if (isDuplicateEntry(error)) {
                return;
            }
            throw error;
        }
    }

    async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
        await db
            .delete(rolePermissions)
            .where(
                and(
                    eq(rolePermissions.roleId, roleId),
                    eq(rolePermissions.permissionId, permissionId),
                ),
            );
    }

    async createUser(data: NewUserRow): Promise<UserRow> {
        try {
            await db.insert(users).values(data);
        } catch (error) {
            if (isDuplicateEntry(error)) {
                throw emailAlreadyExistsError();
            }

            throw error;
        }

        const created = await this.findUserById(data.id);
        if (!created) {
            throw new Error("Failed to load created user.");
        }

        return created;
    }

    async createUserWithInitialRole(
        data: NewUserRow,
    ): Promise<{ user: UserRow; roles: UserRole[]; permissions: PermissionName[] }> {
        return db.transaction(async (tx) => {
            await this.ensureRbacBootstrapTx(tx);

            try {
                await tx.insert(users).values(data);
            } catch (error) {
                if (isDuplicateEntry(error)) {
                    throw emailAlreadyExistsError();
                }
                throw error;
            }

            const [createdUser] = await tx
                .select()
                .from(users)
                .where(eq(users.id, data.id))
                .limit(1);
            if (!createdUser) {
                throw new Error("Failed to load created user.");
            }

            const markerInsert = await tx
                .insert(systemState)
                .values({
                    key: INITIAL_ADMIN_MARKER_KEY,
                    value: data.id,
                })
                .onDuplicateKeyUpdate({
                    set: {
                        value: sql`${systemState.value}`,
                    },
                });
            const shouldBeAdmin = getAffectedRows(markerInsert) === 1;
            const roleName: UserRole = shouldBeAdmin ? "admin" : "user";

            const role = await this.findRoleByNameTx(tx, roleName);
            if (!role) {
                throw new Error(`Role ${roleName} is missing.`);
            }

            await tx.insert(userRoles).values({
                userId: data.id,
                roleId: role.id,
            });

            const assignedRoles = await this.getUserRolesTx(tx, data.id);
            const assignedPermissions = await this.getUserPermissionsTx(tx, data.id);
            await insertPersonalWorkspaceTx(tx, createdUser);

            return {
                user: createdUser,
                roles: assignedRoles,
                permissions: assignedPermissions,
            };
        });
    }

    async createSession(data: NewAuthSessionRow): Promise<AuthSessionRow> {
        await db.insert(authSessions).values(data);

        const created = await this.findSessionById(data.id);
        if (!created) {
            throw new Error("Failed to load created auth session.");
        }

        return created;
    }

    async findSessionById(id: string): Promise<AuthSessionRow | null> {
        const rows = await db.select().from(authSessions).where(eq(authSessions.id, id)).limit(1);
        return rows[0] ?? null;
    }

    async findSessionByRefreshTokenHash(hash: string): Promise<AuthSessionRow | null> {
        const rows = await db
            .select()
            .from(authSessions)
            .where(eq(authSessions.refreshTokenHash, hash))
            .limit(1);

        return rows[0] ?? null;
    }

    async rotateSessionRefreshToken(input: {
        sessionId: string;
        oldHash: string;
        newHash: string;
        expiresAt: Date;
    }): Promise<boolean> {
        const result = await db.transaction(async (tx) => {
            return tx
                .update(authSessions)
                .set({
                    refreshTokenHash: input.newHash,
                    expiresAt: input.expiresAt,
                })
                .where(
                    and(
                        eq(authSessions.id, input.sessionId),
                        eq(authSessions.refreshTokenHash, input.oldHash),
                    ),
                );
        });

        return getAffectedRows(result) === 1;
    }

    async deleteSession(id: string): Promise<void> {
        await db.delete(authSessions).where(eq(authSessions.id, id));
    }

    async deleteSessionByRefreshTokenHash(hash: string): Promise<void> {
        await db.delete(authSessions).where(eq(authSessions.refreshTokenHash, hash));
    }

    async deleteExpiredSessions(): Promise<number> {
        const result = await db.delete(authSessions).where(lte(authSessions.expiresAt, new Date()));
        return getAffectedRows(result);
    }

    async deleteSessionsForUser(userId: string): Promise<number> {
        const result = await db.delete(authSessions).where(eq(authSessions.userId, userId));
        return getAffectedRows(result);
    }

    async updateUserTheme(userId: string, theme: ThemePreference): Promise<UserRow> {
        await db.update(users).set({ theme }).where(eq(users.id, userId));
        const updated = await this.findUserById(userId);
        if (!updated) {
            throw new Error("Failed to load updated user.");
        }
        return updated;
    }

    private async ensureSystemRolesTx(tx: Tx) {
        for (const role of SYSTEM_ROLE_DEFINITIONS) {
            await tx.execute(
                sql`INSERT IGNORE INTO roles (id, name, label, is_system) VALUES (${randomUUID()}, ${role.name}, ${role.label}, ${role.isSystem})`,
            );
            await tx.execute(
                sql`UPDATE roles SET is_system = ${role.isSystem}, label = ${role.label} WHERE name = ${role.name}`,
            );
        }
    }

    private async ensureSystemPermissionsTx(tx: Tx) {
        for (const permission of SYSTEM_PERMISSION_DEFINITIONS) {
            await tx.execute(
                sql`INSERT IGNORE INTO permissions (id, name, label, description) VALUES (${randomUUID()}, ${permission.name}, ${permission.label}, ${permission.description})`,
            );
        }
    }

    private async ensureDefaultRolePermissionsTx(tx: Tx) {
        const adminRole = await this.findRoleByNameTx(tx, "admin");
        const userRole = await this.findRoleByNameTx(tx, "user");

        if (!adminRole || !userRole) {
            throw new Error("Required roles are missing during RBAC bootstrap.");
        }

        const allPermissions = await tx.select().from(permissions);
        const byName = new Map(allPermissions.map((permission) => [permission.name, permission]));

        for (const permission of allPermissions) {
            await tx.execute(
                sql`INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (${adminRole.id}, ${permission.id})`,
            );
        }

        for (const permissionName of DEFAULT_USER_PERMISSIONS) {
            const permission = byName.get(permissionName);
            if (!permission) {
                throw new Error(`Required default permission ${permissionName} does not exist.`);
            }

            await tx.execute(
                sql`INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (${userRole.id}, ${permission.id})`,
            );
        }
    }

    private async ensureRbacBootstrapTx(tx: Tx) {
        await this.ensureSystemRolesTx(tx);
        await this.ensureSystemPermissionsTx(tx);
        await this.ensureDefaultRolePermissionsTx(tx);
    }

    private async findRoleByNameTx(tx: Tx, name: UserRole): Promise<RoleRow | null> {
        const rows = await tx.select().from(roles).where(eq(roles.name, name)).limit(1);
        return rows[0] ?? null;
    }

    private async getUserRolesTx(tx: Tx, userId: string): Promise<UserRole[]> {
        const rows = await tx
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.roleName as UserRole);
    }

    private async getUserPermissionsTx(tx: Tx, userId: string): Promise<PermissionName[]> {
        const rows = await tx
            .selectDistinct({ permissionName: permissions.name })
            .from(userRoles)
            .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
            .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.permissionName);
    }
}
