import type { ReactNode } from "react";

import { useHasPermission } from "@/features/auth/hooks/use-has-permission";
import type { PermissionName } from "@/features/auth/types";

type CanProps = {
    permission: PermissionName;
    children: ReactNode;
    fallback?: ReactNode;
};

export function Can({ permission, children, fallback = null }: CanProps) {
    const allowed = useHasPermission(permission);
    if (!allowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
