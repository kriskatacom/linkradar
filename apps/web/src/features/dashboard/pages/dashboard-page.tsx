import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
    { label: "Websites", value: 0 },
    { label: "Scans", value: 0 },
    { label: "Broken links", value: 0 },
    { label: "Critical issues", value: 0 },
];

export function DashboardPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-600">Overview of your LinkRadar workspace.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((item) => (
                    <Card key={item.label}>
                        <CardHeader className="pb-3">
                            <CardDescription>{item.label}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-semibold">{item.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent scans</CardTitle>
                    <CardDescription>No scans yet.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <p className="text-sm text-slate-600">
                        Add your first website to start monitoring it.
                    </p>
                    <Link to="/app/sites">
                        <Button type="button">Add website</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
