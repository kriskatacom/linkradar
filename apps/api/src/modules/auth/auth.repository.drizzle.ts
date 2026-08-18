import { authSessions, db, roles, systemState, userRoles, users } from "@link-radar/database";
import { and, eq, lte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { emailAlreadyExistsError } from "./auth.errors.js";
import type { AuthRepository } from "./auth.repository.js";
import type {
    AuthSessionRow,
    NewAuthSessionRow,
    NewUserRow,
    RoleRow,
    UserRole,
    UserRow,
} from "./auth.types.js";

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

const SYSTEM_ROLE_DEFINITIONS: Array<{ name: UserRole; label: string }> = [
    { name: "admin", label: "Administrator" },
    { name: "user", label: "User" },
];
const INITIAL_ADMIN_MARKER_KEY = "initial_admin_user_id";

export class DrizzleAuthRepository implements AuthRepository {
    async ensureSystemRoles(): Promise<void> {
        await db.transaction(async (tx) => {
            await this.ensureSystemRolesTx(tx);
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

    async getUserRoles(userId: string): Promise<UserRole[]> {
        const rows = await db
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.roleName as UserRole);
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
    ): Promise<{ user: UserRow; roles: UserRole[] }> {
        return db.transaction(async (tx) => {
            await this.ensureSystemRolesTx(tx);

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

            return {
                user: createdUser,
                roles: assignedRoles,
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

    private async ensureSystemRolesTx(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
        for (const role of SYSTEM_ROLE_DEFINITIONS) {
            await tx.execute(
                sql`INSERT IGNORE INTO roles (id, name, label) VALUES (${randomUUID()}, ${role.name}, ${role.label})`,
            );
        }
    }

    private async findRoleByNameTx(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        name: UserRole,
    ): Promise<RoleRow | null> {
        const rows = await tx.select().from(roles).where(eq(roles.name, name)).limit(1);
        return rows[0] ?? null;
    }

    private async getUserRolesTx(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        userId: string,
    ): Promise<UserRole[]> {
        const rows = await tx
            .select({ roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(eq(userRoles.userId, userId));

        return rows.map((row) => row.roleName as UserRole);
    }
}
