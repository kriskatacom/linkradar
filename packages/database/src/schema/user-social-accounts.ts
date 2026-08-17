import { index, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

import { users } from "./users.js";

export const userSocialAccounts = mysqlTable(
    "user_social_accounts",
    {
        id: varchar("id", { length: 36 }).primaryKey(),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        provider: varchar("provider", { length: 50 }).notNull(),
        providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
        providerEmail: varchar("provider_email", { length: 255 }),
        createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().onUpdateNow(),
    },
    (table) => ({
        userIdIdx: index("user_social_accounts_user_id_idx").on(table.userId),
        providerAccountIdx: uniqueIndex("user_social_accounts_provider_provider_user_id_idx").on(
            table.provider,
            table.providerUserId,
        ),
    }),
);
