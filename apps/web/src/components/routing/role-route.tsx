import { Navigate, Outlet } from "react-router-dom";

import { useHasRole } from "@/features/auth/hooks/use-has-role";
import type { UserRole } from "@/features/auth/types";

export function RoleRoute({ role }: { role: UserRole }) {
    const allowed = useHasRole(role);

    if (!allowed) {
        return <Navigate to="/app/dashboard" replace />;
    }

    return <Outlet />;
}
