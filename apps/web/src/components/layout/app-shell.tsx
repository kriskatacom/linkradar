import { Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "@/components/ui/sidebar";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import { useHasPermission } from "@/features/auth/hooks/use-has-permission";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";

const menuItems = [
    { label: "Dashboard", href: "/app/dashboard" },
    { label: "Sites", href: "/app/sites" },
    { label: "Scans", href: "/app/scans" },
    { label: "Issues", href: "/app/issues" },
    { label: "Reports", href: "/app/reports" },
];

function SidebarContent({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin: boolean }) {
    return (
        <div className="flex h-full flex-col">
            <div className="p-4 text-lg font-semibold text-slate-900">LinkRadar</div>
            <Separator />
            <nav className="flex-1 space-y-1 p-3">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            cn(
                                "block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                isActive && "bg-slate-100 text-slate-900",
                            )
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
            <div className="p-3">
                {isAdmin ? (
                    <NavLink
                        to="/app/admin"
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            cn(
                                "mb-1 block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                                isActive && "bg-slate-100 text-slate-900",
                            )
                        }
                    >
                        Administration
                    </NavLink>
                ) : null}
                <NavLink
                    to="/app/settings"
                    onClick={onNavigate}
                    className={({ isActive }) =>
                        cn(
                            "block rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            isActive && "bg-slate-100 text-slate-900",
                        )
                    }
                >
                    Settings
                </NavLink>
            </div>
        </div>
    );
}

export function AppShell() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [logout, { isLoading: isLoggingOut }] = useLogoutMutation();
    const user = useAppSelector((state) => state.auth.user);
    const isAdmin = useHasPermission(SYSTEM_PERMISSIONS.ADMIN_ACCESS);
    const navigate = useNavigate();

    const initials = useMemo(() => {
        if (!user?.name) {
            return "LR";
        }
        return user.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2);
    }, [user?.name]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex min-h-screen">
                <Sidebar className="hidden w-64 md:block">
                    <SidebarContent isAdmin={isAdmin} />
                </Sidebar>

                <Sheet open={mobileOpen}>
                    <SheetContent className="md:hidden">
                        <SidebarContent isAdmin={isAdmin} onNavigate={() => setMobileOpen(false)} />
                    </SheetContent>
                </Sheet>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                onClick={() => setMobileOpen(true)}
                                aria-label="Open sidebar"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                            <span className="text-sm text-slate-600">Workspace overview</span>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger onClick={() => setMenuOpen((value) => !value)}>
                                <div className="flex items-center gap-3 rounded-md p-1 hover:bg-slate-100">
                                    <Avatar>
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                    <div className="hidden text-left md:block">
                                        <div className="text-sm font-medium text-slate-900">
                                            {user?.name}
                                        </div>
                                        <div className="text-xs text-slate-500">{user?.email}</div>
                                    </div>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent open={menuOpen}>
                                <DropdownMenuItem
                                    onClick={() => {
                                        setMenuOpen(false);
                                        navigate("/app/settings");
                                    }}
                                >
                                    Settings
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={async () => {
                                        await logout().unwrap();
                                        toast.success("You have been logged out.");
                                        navigate("/login");
                                    }}
                                    className="text-red-600"
                                >
                                    {isLoggingOut ? "Logging out..." : "Logout"}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </header>

                    <main className="flex-1 p-4 md:p-6">
                        <Outlet />
                    </main>
                </div>
            </div>
        </div>
    );
}
