import { text, timestamp, uniqueIndex, varchar, mysqlTable } from "drizzle-orm/mysql-core";

export const permissions = mysqlTable(
    "permissions",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        name: varchar("name", { length: 100 }).notNull(),
        label: varchar("label", { length: 150 }).notNull(),
        description: text("description"),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
    },
    (table) => ({
        nameUnique: uniqueIndex("permissions_name_unique").on(table.name),
    }),
);
