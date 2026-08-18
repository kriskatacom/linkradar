import { authSessions, db, users } from "@link-radar/database";
import { and, eq, isNull } from "drizzle-orm";

import { emailAlreadyExistsError } from "./auth.errors.js";
import type { AuthRepository } from "./auth.repository.js";
import type { AuthSessionRow, NewAuthSessionRow, NewUserRow, UserRow } from "./auth.types.js";

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

export class DrizzleAuthRepository implements AuthRepository {
    async findUserByEmail(email: string): Promise<UserRow | null> {
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return rows[0] ?? null;
    }

    async findUserById(id: string): Promise<UserRow | null> {
        const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return rows[0] ?? null;
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
                        isNull(authSessions.revokedAt),
                    ),
                );
        });

        return getAffectedRows(result) === 1;
    }

    async revokeSession(id: string): Promise<void> {
        await db
            .update(authSessions)
            .set({ revokedAt: new Date() })
            .where(and(eq(authSessions.id, id), isNull(authSessions.revokedAt)));
    }

    async revokeSessionByRefreshTokenHash(hash: string): Promise<void> {
        await db
            .update(authSessions)
            .set({ revokedAt: new Date() })
            .where(and(eq(authSessions.refreshTokenHash, hash), isNull(authSessions.revokedAt)));
    }
}
