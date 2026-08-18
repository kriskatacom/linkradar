import { mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const roles = mysqlTable(
    "roles",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        name: varchar("name", { length: 50 }).notNull(),
        label: varchar("label", { length: 100 }).notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
    },
    (table) => ({
        nameUnique: uniqueIndex("roles_name_unique").on(table.name),
    }),
);
