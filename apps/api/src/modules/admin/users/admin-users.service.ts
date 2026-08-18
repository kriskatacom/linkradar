import { validationError } from "../../auth/auth.errors.js";
import type { UserRole } from "../../auth/auth.types.js";
import { lastAdminProtectedError, notFoundError } from "../admin.errors.js";
import type { AdminRepository } from "../admin.repository.js";
import type {
    AdminUserDetail,
    AdminUserListItem,
    ListUsersQuery,
    PaginatedResult,
} from "../admin.types.js";

export class AdminUsersService {
    constructor(private readonly repository: AdminRepository) {}

    listUsers(query: ListUsersQuery): Promise<PaginatedResult<AdminUserListItem>> {
        return this.repository.listUsers(query);
    }

    async getUser(id: string): Promise<AdminUserDetail> {
        const user = await this.repository.findUserById(id);
        if (!user) {
            throw notFoundError("User");
        }
        return user;
    }

    async updateUser(
        id: string,
        data: { name?: string; isActive?: boolean },
        actorUserId: string,
    ): Promise<AdminUserDetail> {
        const user = await this.requireExistingUser(id);

        if (data.isActive === false) {
            await this.assertCanRemoveAdminAccess(id);
            await this.repository.deleteSessionsForUser(id);
        }

        return this.repository.updateUser(id, data);
    }

    async softDeleteUser(id: string, actorUserId: string): Promise<AdminUserDetail> {
        await this.requireExistingUser(id);
        await this.assertCanRemoveAdminAccess(id);

        await this.repository.deleteSessionsForUser(id);
        return this.repository.softDeleteUser(id);
    }

    async restoreUser(id: string): Promise<AdminUserDetail> {
        await this.requireExistingUser(id);
        return this.repository.restoreUser(id);
    }

    async activateUser(id: string): Promise<AdminUserDetail> {
        await this.requireExistingUser(id);
        return this.repository.activateUser(id);
    }

    async deactivateUser(id: string, actorUserId: string): Promise<AdminUserDetail> {
        await this.requireExistingUser(id);
        await this.assertCanRemoveAdminAccess(id);

        await this.repository.deleteSessionsForUser(id);
        return this.repository.deactivateUser(id);
    }

    async syncUserRoles(
        id: string,
        roleNames: UserRole[],
        actorUserId: string,
    ): Promise<AdminUserDetail> {
        await this.requireExistingUser(id);
        await this.validateRoleNames(roleNames);

        const currentRoles = (await this.repository.findUserById(id))?.roles ?? [];
        const removingAdmin =
            currentRoles.includes("admin") && !roleNames.includes("admin");

        if (removingAdmin) {
            await this.assertCanRemoveAdminAccess(id);
        }

        return this.repository.syncUserRoles(id, roleNames);
    }

    private async requireExistingUser(id: string) {
        const user = await this.repository.findUserById(id);
        if (!user) {
            throw notFoundError("User");
        }
        return user;
    }

    private async validateRoleNames(roleNames: UserRole[]) {
        const uniqueNames = [...new Set(roleNames)];
        const allRoles = await this.repository.getAllRoles();
        const knownNames = new Set(allRoles.map((role) => role.name));
        const invalid = uniqueNames.filter((name) => !knownNames.has(name));

        if (invalid.length > 0) {
            throw validationError({
                roles: [`Unknown roles: ${invalid.join(", ")}`],
            });
        }
    }

    private async assertCanRemoveAdminAccess(targetUserId: string) {
        const isTargetAdmin = await this.repository.isActiveAdminUser(targetUserId);
        if (!isTargetAdmin) {
            return;
        }

        const otherActiveAdmins = await this.repository.countActiveAdminUsers(targetUserId);
        if (otherActiveAdmins === 0) {
            throw lastAdminProtectedError();
        }
    }
}
