import { relations } from "drizzle-orm";

import { authSessions } from "./auth-sessions.js";
import { permissions } from "./permissions.js";
import { rolePermissions } from "./role-permissions.js";
import { roles } from "./roles.js";
import { systemState } from "./system-state.js";
import { userSocialAccounts } from "./user-social-accounts.js";
import { userRoles } from "./user-roles.js";
import { users } from "./users.js";

export { authSessions } from "./auth-sessions.js";
export { permissions } from "./permissions.js";
export { rolePermissions } from "./role-permissions.js";
export { roles } from "./roles.js";
export { systemState } from "./system-state.js";
export { userSocialAccounts } from "./user-social-accounts.js";
export { userRoles } from "./user-roles.js";
export { users } from "./users.js";

export const usersRelations = relations(users, ({ many }) => ({
    authSessions: many(authSessions),
    socialAccounts: many(userSocialAccounts),
    userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
    userRoles: many(userRoles),
    rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
    rolePermissions: many(rolePermissions),
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

export const userRolesRelations = relations(userRoles, ({ one }) => ({
    user: one(users, {
        fields: [userRoles.userId],
        references: [users.id],
    }),
    role: one(roles, {
        fields: [userRoles.roleId],
        references: [roles.id],
    }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
    role: one(roles, {
        fields: [rolePermissions.roleId],
        references: [roles.id],
    }),
    permission: one(permissions, {
        fields: [rolePermissions.permissionId],
        references: [permissions.id],
    }),
}));
