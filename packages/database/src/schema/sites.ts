import {
    boolean,
    datetime,
    index,
    mysqlTable,
    timestamp,
    uniqueIndex,
    varchar,
} from "drizzle-orm/mysql-core";

import { workspaces } from "./workspaces.js";

export const sites = mysqlTable(
    "sites",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        workspaceId: varchar("workspace_id", { length: 36 })
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 150 }).notNull(),
        url: varchar("url", { length: 2048 }).notNull(),
        normalizedUrl: varchar("normalized_url", { length: 700 }).notNull(),
        isActive: boolean("is_active").notNull().default(true),
        lastScannedAt: datetime("last_scanned_at", { mode: "date" }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
        deletedAt: datetime("deleted_at", { mode: "date" }),
    },
    (table) => ({
        workspaceNormalizedUnique: uniqueIndex("sites_workspace_normalized_url_unique").on(
            table.workspaceId,
            table.normalizedUrl,
        ),
        workspaceIdIdx: index("sites_workspace_id_idx").on(table.workspaceId),
        deletedAtIdx: index("sites_deleted_at_idx").on(table.deletedAt),
    }),
);
