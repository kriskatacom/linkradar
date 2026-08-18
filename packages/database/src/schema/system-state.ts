import { mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const systemState = mysqlTable(
    "system_state",
    {
        key: varchar("key", { length: 100 }).primaryKey(),
        value: varchar("value", { length: 255 }).notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
    },
    (table) => ({
        keyUnique: uniqueIndex("system_state_key_unique").on(table.key),
    }),
);
