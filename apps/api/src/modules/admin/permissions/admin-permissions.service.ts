import type { AdminRepository } from "../admin.repository.js";
import type { AdminPermissionItem, AdminStats } from "../admin.types.js";

export class AdminPermissionsService {
    constructor(private readonly repository: AdminRepository) {}

    listPermissions(): Promise<AdminPermissionItem[]> {
        return this.repository.listPermissions();
    }
}

export class AdminStatsService {
    constructor(private readonly repository: AdminRepository) {}

    getStats(): Promise<AdminStats> {
        return this.repository.getStats();
    }
}
