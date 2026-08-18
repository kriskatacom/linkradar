import type {
    ListSitesQuery,
    ListWorkspacesQuery,
    PaginatedResult,
    SiteSummary,
    WorkspaceDetail,
    WorkspaceMemberRole,
    WorkspaceSummary,
} from "./workspace.types.js";

export type WorkspaceMembership = {
    workspaceId: string;
    userId: string;
    role: WorkspaceMemberRole;
};

export interface WorkspaceRepository {
    listForUser(
        userId: string,
        query: ListWorkspacesQuery,
    ): Promise<PaginatedResult<WorkspaceSummary>>;
    listAllForUser(userId: string): Promise<WorkspaceSummary[]>;
    findById(id: string): Promise<WorkspaceDetail | null>;
    findMembership(userId: string, workspaceId: string): Promise<WorkspaceMembership | null>;
    createWorkspace(input: {
        ownerUserId: string;
        name: string;
        slug?: string;
    }): Promise<WorkspaceDetail>;
    updateWorkspace(id: string, input: { name: string }): Promise<WorkspaceDetail>;
    softDeleteWorkspace(id: string): Promise<WorkspaceDetail>;
    ensurePersonalWorkspace(user: { id: string; name: string }): Promise<WorkspaceDetail>;
    backfillPersonalWorkspaces(): Promise<number>;
    countMembers(workspaceId: string): Promise<number>;

    listSites(
        workspaceId: string,
        query: ListSitesQuery,
    ): Promise<PaginatedResult<SiteSummary>>;
    findSiteById(workspaceId: string, siteId: string): Promise<SiteSummary | null>;
    findSiteByNormalizedUrl(
        workspaceId: string,
        normalizedUrl: string,
    ): Promise<SiteSummary | null>;
    createSite(input: {
        workspaceId: string;
        name: string;
        url: string;
        normalizedUrl: string;
    }): Promise<SiteSummary>;
    updateSite(
        workspaceId: string,
        siteId: string,
        input: { name?: string; url?: string; normalizedUrl?: string; isActive?: boolean },
    ): Promise<SiteSummary>;
    softDeleteSite(workspaceId: string, siteId: string): Promise<SiteSummary>;
    restoreSite(workspaceId: string, siteId: string): Promise<SiteSummary>;
}
