import { useAppSelector } from "@/hooks/redux";

import { hasAnyPermission } from "../permission-utils";
import type { PermissionName } from "../types";

export function useHasAnyPermission(permissions: PermissionName[]): boolean {
    const user = useAppSelector((state) => state.auth.user);
    return hasAnyPermission(user, permissions);
}
