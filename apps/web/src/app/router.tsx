import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { GuestRoute } from "@/components/routing/guest-route";
import { PermissionRoute } from "@/components/routing/permission-route";
import { ProtectedRoute } from "@/components/routing/protected-route";
import { AdminLayout } from "@/features/admin/components/admin-layout";
import { AdminDashboardPage } from "@/features/admin/pages/admin-dashboard-page";
import { AdminPermissionsPage } from "@/features/admin/pages/admin-permissions-page";
import { AdminRoleDetailPage } from "@/features/admin/pages/admin-role-detail-page";
import { AdminRolesPage } from "@/features/admin/pages/admin-roles-page";
import { AdminUserDetailPage } from "@/features/admin/pages/admin-user-detail-page";
import { AdminUsersPage } from "@/features/admin/pages/admin-users-page";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { PlaceholderPage } from "@/features/dashboard/pages/placeholder-page";
import { SettingsPage } from "@/features/settings/pages/settings-page";
import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password-page";
import { LoginPage } from "@/features/auth/pages/login-page";
import { RegisterPage } from "@/features/auth/pages/register-page";
import { ResetPasswordPage } from "@/features/auth/pages/reset-password-page";
import { VerifyEmailPage } from "@/features/auth/pages/verify-email-page";
import { AddSitePage } from "@/features/sites/pages/add-site-page";
import { SiteDetailPage } from "@/features/sites/pages/site-detail-page";
import { SiteSettingsPage } from "@/features/sites/pages/site-settings-page";
import { SitesPage } from "@/features/sites/pages/sites-page";
import { WorkspaceSettingsPage } from "@/features/workspaces/pages/workspace-settings-page";
import { WorkspacesPage } from "@/features/workspaces/pages/workspaces-page";

export const router = createBrowserRouter([
    {
        element: <GuestRoute />,
        children: [
            { path: "/login", element: <LoginPage /> },
            { path: "/register", element: <RegisterPage /> },
            { path: "/forgot-password", element: <ForgotPasswordPage /> },
        ],
    },
    {
        path: "/app",
        element: <ProtectedRoute />,
        children: [
            {
                element: <AppShell />,
                children: [
                    { index: true, element: <Navigate to="/app/dashboard" replace /> },
                    { path: "dashboard", element: <DashboardPage /> },
                    {
                        element: <PermissionRoute permission={SYSTEM_PERMISSIONS.SITES_VIEW} />,
                        children: [
                            { path: "sites", element: <SitesPage /> },
                            { path: "sites/new", element: <AddSitePage /> },
                            { path: "sites/:siteId", element: <SiteDetailPage /> },
                            { path: "sites/:siteId/settings", element: <SiteSettingsPage /> },
                        ],
                    },
                    { path: "workspaces", element: <WorkspacesPage /> },
                    { path: "workspaces/:id/settings", element: <WorkspaceSettingsPage /> },
                    { path: "scans", element: <PlaceholderPage title="Scans" /> },
                    { path: "issues", element: <PlaceholderPage title="Issues" /> },
                    { path: "reports", element: <PlaceholderPage title="Reports" /> },
                    { path: "settings", element: <SettingsPage /> },
                    {
                        element: <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN_ACCESS} />,
                        children: [
                            {
                                path: "admin",
                                element: <AdminLayout />,
                                children: [
                                    { index: true, element: <AdminDashboardPage /> },
                                    {
                                        element: (
                                            <PermissionRoute
                                                permission={SYSTEM_PERMISSIONS.USERS_VIEW}
                                            />
                                        ),
                                        children: [
                                            { path: "users", element: <AdminUsersPage /> },
                                            { path: "users/:id", element: <AdminUserDetailPage /> },
                                        ],
                                    },
                                    {
                                        element: (
                                            <PermissionRoute
                                                permission={SYSTEM_PERMISSIONS.ROLES_VIEW}
                                            />
                                        ),
                                        children: [
                                            { path: "roles", element: <AdminRolesPage /> },
                                            { path: "roles/:id", element: <AdminRoleDetailPage /> },
                                            {
                                                path: "permissions",
                                                element: <AdminPermissionsPage />,
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    { path: "/verify-email", element: <VerifyEmailPage /> },
    { path: "/reset-password", element: <ResetPasswordPage /> },
    {
        path: "*",
        element: <Navigate to="/app/dashboard" replace />,
    },
]);
