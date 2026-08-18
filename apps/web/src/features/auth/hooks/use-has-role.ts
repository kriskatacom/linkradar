import { useAppSelector } from "@/hooks/redux";

import { hasRole } from "../role-utils";
import type { UserRole } from "../types";

export function useHasRole(role: UserRole): boolean {
    const user = useAppSelector((state) => state.auth.user);
    return hasRole(user, role);
}
