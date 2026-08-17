import { relations } from "drizzle-orm";

import { authSessions } from "./auth-sessions.js";
import { userSocialAccounts } from "./user-social-accounts.js";
import { users } from "./users.js";

export { authSessions } from "./auth-sessions.js";
export { userSocialAccounts } from "./user-social-accounts.js";
export { users } from "./users.js";

export const usersRelations = relations(users, ({ many }) => ({
    authSessions: many(authSessions),
    socialAccounts: many(userSocialAccounts),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
    user: one(users, {
        fields: [authSessions.userId],
        references: [users.id],
    }),
}));

export const userSocialAccountsRelations = relations(userSocialAccounts, ({ one }) => ({
    user: one(users, {
        fields: [userSocialAccounts.userId],
        references: [users.id],
    }),
}));
