import { index, mysqlTable, primaryKey, timestamp, varchar } from "drizzle-orm/mysql-core";

import { roles } from "./roles.js";
import { users } from "./users.js";

export const userRoles = mysqlTable(
    "user_roles",
    {
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        roleId: varchar("role_id", { length: 36 })
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.userId, table.roleId], name: "user_roles_pk" }),
        userIdIdx: index("user_roles_user_id_idx").on(table.userId),
        roleIdIdx: index("user_roles_role_id_idx").on(table.roleId),
    }),
);
