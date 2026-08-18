import { Navigate, Outlet } from "react-router-dom";

import { useAppSelector } from "@/hooks/redux";

export function ProtectedRoute() {
    const { user, initialized } = useAppSelector((state) => state.auth);

    if (!initialized) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
