import { useAppSelector } from "@/hooks/redux";

import { hasPermission } from "../permission-utils";
import type { PermissionName } from "../types";

export function useHasPermission(permission: PermissionName): boolean {
    const user = useAppSelector((state) => state.auth.user);
    return hasPermission(user, permission);
}
