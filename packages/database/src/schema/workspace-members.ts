import { index, mysqlTable, primaryKey, timestamp, varchar } from "drizzle-orm/mysql-core";

import { users } from "./users.js";
import { workspaces } from "./workspaces.js";

export const workspaceMembers = mysqlTable(
    "workspace_members",
    {
        workspaceId: varchar("workspace_id", { length: 36 })
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: varchar("role", { length: 30 }).notNull(),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    },
    (table) => ({
        pk: primaryKey({
            columns: [table.workspaceId, table.userId],
            name: "workspace_members_pk",
        }),
        workspaceIdIdx: index("workspace_members_workspace_id_idx").on(table.workspaceId),
        userIdIdx: index("workspace_members_user_id_idx").on(table.userId),
    }),
);
