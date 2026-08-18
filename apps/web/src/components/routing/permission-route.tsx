import { Outlet } from "react-router-dom";

import { useHasPermission } from "@/features/auth/hooks/use-has-permission";
import { ForbiddenPage } from "@/features/admin/pages/forbidden-page";
import type { PermissionName } from "@/features/auth/types";

export function PermissionRoute({ permission }: { permission: PermissionName }) {
    const allowed = useHasPermission(permission);

    if (!allowed) {
        return <ForbiddenPage />;
    }

    return <Outlet />;
}
