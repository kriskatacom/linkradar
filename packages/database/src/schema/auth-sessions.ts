import {
    datetime,
    index,
    mysqlTable,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./users.js";

export const authSessions = mysqlTable(
    "auth_sessions",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
        userAgent: varchar("user_agent", { length: 500 }),
        ipAddress: varchar("ip_address", { length: 45 }),
        expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
        revokedAt: datetime("revoked_at", { mode: "date" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    },
    (table) => ({
        userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
        expiresAtIdx: index("auth_sessions_expires_at_idx").on(table.expiresAt),
        refreshTokenHashIdx: uniqueIndex("auth_sessions_refresh_token_hash_idx").on(
            table.refreshTokenHash,
        ),
    }),
);
