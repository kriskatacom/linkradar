import { createBrowserRouter, Navigate } from "react-router-dom";

import { AppShell } from "@/components/layout/app-shell";
import { GuestRoute } from "@/components/routing/guest-route";
import { PermissionRoute } from "@/components/routing/permission-route";
import { ProtectedRoute } from "@/components/routing/protected-route";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page";
import { PlaceholderPage } from "@/features/dashboard/pages/placeholder-page";
import { LoginPage } from "@/features/auth/pages/login-page";
import { RegisterPage } from "@/features/auth/pages/register-page";

export const router = createBrowserRouter([
    {
        element: <GuestRoute />,
        children: [
            { path: "/login", element: <LoginPage /> },
            { path: "/register", element: <RegisterPage /> },
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
                    { path: "sites", element: <PlaceholderPage title="Sites" /> },
                    { path: "scans", element: <PlaceholderPage title="Scans" /> },
                    { path: "issues", element: <PlaceholderPage title="Issues" /> },
                    { path: "reports", element: <PlaceholderPage title="Reports" /> },
                    { path: "settings", element: <PlaceholderPage title="Settings" /> },
                    {
                        element: <PermissionRoute permission={SYSTEM_PERMISSIONS.ADMIN_ACCESS} />,
                        children: [
                            { path: "admin", element: <PlaceholderPage title="Administration" /> },
                        ],
                    },
                ],
            },
        ],
    },
    {
        path: "*",
        element: <Navigate to="/app/dashboard" replace />,
    },
]);
