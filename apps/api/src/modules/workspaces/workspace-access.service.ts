import { forbiddenError, unauthenticatedError } from "../auth/auth.errors.js";
import { workspaceAccessDeniedError, workspaceNotFoundError, workspaceRoleDeniedError } from "./workspace.errors.js";
import type { WorkspaceRepository, WorkspaceMembership } from "./workspace.repository.js";
import type { WorkspaceMemberRole } from "./workspace.types.js";

const MANAGE_WORKSPACE_ROLES: WorkspaceMemberRole[] = ["owner", "admin"];
const WRITE_SITE_ROLES: WorkspaceMemberRole[] = ["owner", "admin", "member"];

export class WorkspaceAccessService {
    constructor(private readonly repository: WorkspaceRepository) {}

    async getWorkspaceMembership(
        userId: string,
        workspaceId: string,
    ): Promise<WorkspaceMembership | null> {
        return this.repository.findMembership(userId, workspaceId);
    }

    async requireWorkspaceMember(userId: string, workspaceId: string): Promise<WorkspaceMembership> {
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw workspaceNotFoundError();
        }

        const membership = await this.repository.findMembership(userId, workspaceId);
        if (!membership) {
            throw workspaceAccessDeniedError();
        }

        return membership;
    }

    async requireWorkspaceRole(
        userId: string,
        workspaceId: string,
        allowedRoles: WorkspaceMemberRole[],
    ): Promise<WorkspaceMembership> {
        const membership = await this.requireWorkspaceMember(userId, workspaceId);
        if (!allowedRoles.includes(membership.role)) {
            throw workspaceRoleDeniedError();
        }
        return membership;
    }

    requireManageWorkspace(userId: string, workspaceId: string) {
        return this.requireWorkspaceRole(userId, workspaceId, MANAGE_WORKSPACE_ROLES);
    }

    requireWriteSites(userId: string, workspaceId: string) {
        return this.requireWorkspaceRole(userId, workspaceId, WRITE_SITE_ROLES);
    }
}

export function requireAuthenticatedUserId(userId: string | undefined): string {
    if (!userId) {
        throw unauthenticatedError();
    }
    return userId;
}

export function assertPermission(hasPermission: boolean): void {
    if (!hasPermission) {
        throw forbiddenError();
    }
}
