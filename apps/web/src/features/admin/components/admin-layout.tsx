import { NavLink, Outlet } from "react-router-dom";

import { Can } from "@/components/auth/can";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";
import { cn } from "@/lib/utils";

const links = [
    { href: "/app/admin", label: "Overview", exact: true, permission: SYSTEM_PERMISSIONS.ADMIN_ACCESS },
    { href: "/app/admin/users", label: "Users", permission: SYSTEM_PERMISSIONS.USERS_VIEW },
    { href: "/app/admin/roles", label: "Roles", permission: SYSTEM_PERMISSIONS.ROLES_VIEW },
    {
        href: "/app/admin/permissions",
        label: "Permissions",
        permission: SYSTEM_PERMISSIONS.ROLES_VIEW,
    },
];

export function AdminLayout() {
    return (
        <div className="space-y-6">
            <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
                {links.map((link) => (
                    <Can key={link.href} permission={link.permission}>
                        <NavLink
                            to={link.href}
                            end={link.exact}
                            className={({ isActive }) =>
                                cn(
                                    "rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100",
                                    isActive && "bg-slate-100 font-medium text-slate-900",
                                )
                            }
                        >
                            {link.label}
                        </NavLink>
                    </Can>
                ))}
            </nav>
            <Outlet />
        </div>
    );
}
