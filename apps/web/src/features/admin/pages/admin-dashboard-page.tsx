import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAdminStatsQuery } from "@/features/admin/api/adminApi";
import { PageHeader } from "@/features/admin/components/admin-ui";

export function AdminDashboardPage() {
    const { data, isLoading } = useGetAdminStatsQuery();

    const stats = data?.data.stats;

    return (
        <div>
            <PageHeader
                title="Administration"
                description="Manage users, roles, and permissions for LinkRadar."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: "Users", value: stats?.users, href: "/app/admin/users" },
                    { label: "Active users", value: stats?.activeUsers, href: "/app/admin/users" },
                    { label: "Roles", value: stats?.roles, href: "/app/admin/roles" },
                    { label: "Permissions", value: stats?.permissions, href: "/app/admin/permissions" },
                ].map((item) => (
                    <Link key={item.label} to={item.href}>
                        <Card className="transition hover:border-slate-300">
                            <CardHeader>
                                <CardTitle className="text-base font-medium text-slate-600">
                                    {item.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-semibold text-slate-900">
                                    {isLoading ? "..." : (item.value ?? 0)}
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
