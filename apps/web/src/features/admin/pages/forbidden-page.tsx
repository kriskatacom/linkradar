import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ForbiddenPage() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Card className="max-w-md p-8 text-center">
                <div className="text-3xl font-semibold text-slate-900">403</div>
                <h1 className="mt-2 text-xl font-medium text-slate-900">Access denied</h1>
                <p className="mt-2 text-sm text-slate-600">
                    You do not have permission to view this administration page.
                </p>
                <Link to="/app/dashboard" className="mt-6 inline-block">
                    <Button type="button">Back to dashboard</Button>
                </Link>
            </Card>
        </div>
    );
}
