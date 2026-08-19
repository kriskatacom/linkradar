import {
    datetime,
    index,
    mysqlTable,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./users.js";

export const emailVerificationTokens = mysqlTable(
    "email_verification_tokens",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        tokenHash: varchar("token_hash", { length: 255 }).notNull(),
        expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
        usedAt: datetime("used_at", { mode: "date" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    },
    (table) => ({
        userIdIdx: index("email_verification_tokens_user_id_idx").on(table.userId),
        expiresAtIdx: index("email_verification_tokens_expires_at_idx").on(table.expiresAt),
        tokenHashIdx: uniqueIndex("email_verification_tokens_token_hash_idx").on(table.tokenHash),
    }),
);

export const passwordResetTokens = mysqlTable(
    "password_reset_tokens",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        tokenHash: varchar("token_hash", { length: 255 }).notNull(),
        expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
        usedAt: datetime("used_at", { mode: "date" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    },
    (table) => ({
        userIdIdx: index("password_reset_tokens_user_id_idx").on(table.userId),
        expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(table.expiresAt),
        tokenHashIdx: uniqueIndex("password_reset_tokens_token_hash_idx").on(table.tokenHash),
    }),
);
