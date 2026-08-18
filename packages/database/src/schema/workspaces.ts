import {
    datetime,
    index,
    mysqlTable,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/mysql-core";

import { users } from "./users.js";

export const workspaces = mysqlTable(
    "workspaces",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        name: varchar("name", { length: 150 }).notNull(),
        slug: varchar("slug", { length: 180 }).notNull(),
        ownerUserId: varchar("owner_user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
        deletedAt: datetime("deleted_at", { mode: "date" }),
    },
    (table) => ({
        slugUnique: uniqueIndex("workspaces_slug_unique").on(table.slug),
        ownerUserIdIdx: index("workspaces_owner_user_id_idx").on(table.ownerUserId),
        deletedAtIdx: index("workspaces_deleted_at_idx").on(table.deletedAt),
    }),
);
