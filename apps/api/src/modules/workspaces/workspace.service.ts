import type { WorkspaceAccessService } from "./workspace-access.service.js";
import type { WorkspaceRepository } from "./workspace.repository.js";
import type { ListWorkspacesQuery, WorkspaceDetail } from "./workspace.types.js";
import { workspaceNotFoundError } from "./workspace.errors.js";

export class WorkspaceService {
    constructor(
        private readonly repository: WorkspaceRepository,
        private readonly access: WorkspaceAccessService,
    ) {}

    listForUser(userId: string, query: ListWorkspacesQuery) {
        return this.repository.listForUser(userId, query);
    }

    listAllForUser(userId: string) {
        return this.repository.listAllForUser(userId);
    }

    async getWorkspace(userId: string, workspaceId: string): Promise<WorkspaceDetail> {
        const membership = await this.access.requireWorkspaceMember(userId, workspaceId);
        const workspace = await this.repository.findById(workspaceId);
        if (!workspace) {
            throw workspaceNotFoundError();
        }
        return { ...workspace, role: membership.role };
    }

    createWorkspace(userId: string, name: string) {
        return this.repository.createWorkspace({ ownerUserId: userId, name });
    }

    async updateWorkspace(userId: string, workspaceId: string, name: string) {
        const membership = await this.access.requireManageWorkspace(userId, workspaceId);
        const updated = await this.repository.updateWorkspace(workspaceId, { name });
        return { ...updated, role: membership.role };
    }

    async deleteWorkspace(userId: string, workspaceId: string) {
        await this.access.requireWorkspaceRole(userId, workspaceId, ["owner"]);
        return this.repository.softDeleteWorkspace(workspaceId);
    }

    ensurePersonalWorkspace(user: { id: string; name: string }) {
        return this.repository.ensurePersonalWorkspace(user);
    }

    backfillPersonalWorkspaces() {
        return this.repository.backfillPersonalWorkspaces();
    }
}
