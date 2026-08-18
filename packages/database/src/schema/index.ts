import { relations } from "drizzle-orm";

import { authSessions } from "./auth-sessions.js";
import { permissions } from "./permissions.js";
import { rolePermissions } from "./role-permissions.js";
import { roles } from "./roles.js";
import { sites } from "./sites.js";
import { systemState } from "./system-state.js";
import { userSocialAccounts } from "./user-social-accounts.js";
import { userRoles } from "./user-roles.js";
import { users } from "./users.js";
import { workspaceMembers } from "./workspace-members.js";
import { workspaces } from "./workspaces.js";

export { authSessions } from "./auth-sessions.js";
export { permissions } from "./permissions.js";
export { rolePermissions } from "./role-permissions.js";
export { roles } from "./roles.js";
export { sites } from "./sites.js";
export { systemState } from "./system-state.js";
export { userSocialAccounts } from "./user-social-accounts.js";
export { userRoles } from "./user-roles.js";
export { users } from "./users.js";
export { workspaceMembers } from "./workspace-members.js";
export { workspaces } from "./workspaces.js";

export const usersRelations = relations(users, ({ many }) => ({
    authSessions: many(authSessions),
    socialAccounts: many(userSocialAccounts),
    userRoles: many(userRoles),
    ownedWorkspaces: many(workspaces),
    workspaceMemberships: many(workspaceMembers),
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

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    owner: one(users, {
        fields: [workspaces.ownerUserId],
        references: [users.id],
    }),
    members: many(workspaceMembers),
    sites: many(sites),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [workspaceMembers.workspaceId],
        references: [workspaces.id],
    }),
    user: one(users, {
        fields: [workspaceMembers.userId],
        references: [users.id],
    }),
}));

export const sitesRelations = relations(sites, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [sites.workspaceId],
        references: [workspaces.id],
    }),
}));
