import type { sites, workspaceMembers, workspaces } from "@link-radar/database";

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type WorkspaceMemberRow = typeof workspaceMembers.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;

export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";

export type PaginationMeta = {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
};

export type PaginatedResult<T> = {
    items: T[];
    pagination: PaginationMeta;
};

export type WorkspaceSummary = {
    id: string;
    name: string;
    slug: string;
    ownerUserId: string;
    role: WorkspaceMemberRole;
    membersCount: number;
    createdAt: string;
    updatedAt: string;
};

export type WorkspaceDetail = WorkspaceSummary;

export type SiteSummary = {
    id: string;
    workspaceId: string;
    name: string;
    url: string;
    normalizedUrl: string;
    isActive: boolean;
    lastScannedAt: string | null;
    deletedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ListWorkspacesQuery = {
    page: number;
    perPage: number;
    search?: string;
};

export type ListSitesQuery = {
    page: number;
    perPage: number;
    search?: string;
    status?: "active" | "inactive" | "deleted" | "all";
    sort: "name" | "url" | "createdAt" | "updatedAt";
    direction: "asc" | "desc";
};
