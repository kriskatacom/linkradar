import { boolean, datetime, index, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable(
    "users",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        name: varchar("name", { length: 150 }).notNull(),
        email: varchar("email", { length: 255 }).notNull().unique(),
        passwordHash: varchar("password_hash", { length: 255 }),
        emailVerifiedAt: datetime("email_verified_at", { mode: "date" }),
        isActive: boolean("is_active").notNull().default(true),
        theme: varchar("theme", { length: 16 }).notNull().default("system"),
        deletedAt: datetime("deleted_at", { mode: "date" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
    },
    (table) => ({
        deletedAtIdx: index("users_deleted_at_idx").on(table.deletedAt),
    }),
);
