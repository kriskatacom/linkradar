import { index, mysqlTable, primaryKey, timestamp, varchar } from "drizzle-orm/mysql-core";

import { permissions } from "./permissions.js";
import { roles } from "./roles.js";

export const rolePermissions = mysqlTable(
    "role_permissions",
    {
        roleId: varchar("role_id", { length: 36 })
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),
        permissionId: varchar("permission_id", { length: 36 })
            .notNull()
            .references(() => permissions.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    },
    (table) => ({
        pk: primaryKey({
            columns: [table.roleId, table.permissionId],
            name: "role_permissions_pk",
        }),
        roleIdIdx: index("role_permissions_role_id_idx").on(table.roleId),
        permissionIdIdx: index("role_permissions_permission_id_idx").on(table.permissionId),
    }),
);
