import { validationError } from "../../auth/auth.errors.js";
import type { PermissionName } from "../../auth/auth.types.js";
import {
    adminRolePermissionsReadOnlyError,
    duplicateRoleNameError,
    notFoundError,
    roleInUseError,
    systemRoleProtectedError,
} from "../admin.errors.js";
import type { AdminRepository } from "../admin.repository.js";
import type {
    AdminRoleDetail,
    AdminRoleListItem,
    ListRolesQuery,
    PaginatedResult,
} from "../admin.types.js";

export class AdminRolesService {
    constructor(private readonly repository: AdminRepository) {}

    listRoles(query: ListRolesQuery): Promise<PaginatedResult<AdminRoleListItem>> {
        return this.repository.listRoles(query);
    }

    async getRole(id: string): Promise<AdminRoleDetail> {
        const role = await this.repository.findRoleById(id);
        if (!role) {
            throw notFoundError("Role");
        }
        return role;
    }

    async createRole(data: { name: string; label: string }): Promise<AdminRoleDetail> {
        const existing = await this.repository.findRoleByName(data.name);
        if (existing) {
            throw duplicateRoleNameError();
        }

        try {
            return await this.repository.createRole(data);
        } catch {
            throw duplicateRoleNameError();
        }
    }

    async updateRole(id: string, data: { label: string }): Promise<AdminRoleDetail> {
        const role = await this.getRole(id);
        return this.repository.updateRole(role.id, data);
    }

    async deleteRole(id: string): Promise<void> {
        const role = await this.getRole(id);

        if (role.isSystem || role.name === "admin" || role.name === "user") {
            throw systemRoleProtectedError();
        }

        const usersCount = await this.repository.countUsersWithRole(role.id);
        if (usersCount > 0) {
            throw roleInUseError();
        }

        await this.repository.deleteRole(role.id);
    }

    async syncRolePermissions(
        id: string,
        permissionNames: PermissionName[],
    ): Promise<AdminRoleDetail> {
        const role = await this.getRole(id);

        if (role.name === "admin") {
            throw adminRolePermissionsReadOnlyError();
        }

        const uniqueNames = [...new Set(permissionNames)];
        const known = await this.repository.getPermissionsByNames(uniqueNames);
        if (known.length !== uniqueNames.length) {
            const missing = uniqueNames.filter((name) => !known.includes(name));
            throw validationError({
                permissions: [`Unknown permissions: ${missing.join(", ")}`],
            });
        }

        return this.repository.syncRolePermissions(role.id, uniqueNames);
    }
}
