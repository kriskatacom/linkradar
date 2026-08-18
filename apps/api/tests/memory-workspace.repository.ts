import { randomUUID } from "node:crypto";

import { buildPersonalWorkspace, personalWorkspaceName, uniqueWorkspaceSlug } from "../src/modules/workspaces/personal-workspace.js";
import type {
    WorkspaceMembership,
    WorkspaceRepository,
} from "../src/modules/workspaces/workspace.repository.js";
import type {
    ListSitesQuery,
    ListWorkspacesQuery,
    PaginatedResult,
    SiteSummary,
    WorkspaceDetail,
    WorkspaceMemberRole,
    WorkspaceSummary,
} from "../src/modules/workspaces/workspace.types.js";
import type { MemoryAuthRepository } from "./memory-auth.repository.js";

type WorkspaceRecord = {
    id: string;
    name: string;
    slug: string;
    ownerUserId: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};

type SiteRecord = {
    id: string;
    workspaceId: string;
    name: string;
    url: string;
    normalizedUrl: string;
    isActive: boolean;
    lastScannedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};

export class MemoryWorkspaceStore {
    readonly workspaces = new Map<string, WorkspaceRecord>();
    readonly members = new Map<string, Map<string, WorkspaceMemberRole>>();
    readonly sites = new Map<string, SiteRecord>();
}

export class MemoryWorkspaceRepository implements WorkspaceRepository {
    constructor(
        readonly store: MemoryWorkspaceStore,
        private readonly authRepository?: MemoryAuthRepository,
    ) {}

    async listForUser(
        userId: string,
        query: ListWorkspacesQuery,
    ): Promise<PaginatedResult<WorkspaceSummary>> {
        let items = [...this.store.workspaces.values()]
            .filter((workspace) => workspace.deletedAt === null)
            .filter((workspace) => this.store.members.get(workspace.id)?.has(userId));

        if (query.search) {
            const term = query.search.toLowerCase();
            items = items.filter(
                (workspace) =>
                    workspace.name.toLowerCase().includes(term) ||
                    workspace.slug.toLowerCase().includes(term),
            );
        }

        items.sort((a, b) => a.name.localeCompare(b.name));
        const total = items.length;
        const start = (query.page - 1) * query.perPage;
        const pageItems = items.slice(start, start + query.perPage);

        return {
            items: pageItems.map((workspace) => this.mapWorkspace(workspace, userId)),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / query.perPage),
            },
        };
    }

    async listAllForUser(userId: string): Promise<WorkspaceSummary[]> {
        const result = await this.listForUser(userId, { page: 1, perPage: 100 });
        return result.items;
    }

    async findById(id: string): Promise<WorkspaceDetail | null> {
        const workspace = this.store.workspaces.get(id);
        if (!workspace || workspace.deletedAt) {
            return null;
        }
        return this.mapWorkspace(workspace, workspace.ownerUserId);
    }

    async findMembership(userId: string, workspaceId: string): Promise<WorkspaceMembership | null> {
        const role = this.store.members.get(workspaceId)?.get(userId);
        if (!role) {
            return null;
        }
        return { workspaceId, userId, role };
    }

    async createWorkspace(input: {
        ownerUserId: string;
        name: string;
        slug?: string;
    }): Promise<WorkspaceDetail> {
        const slug =
            input.slug ??
            uniqueWorkspaceSlug(
                input.name,
                new Set([...this.store.workspaces.values()].map((item) => item.slug)),
            );
        const now = new Date();
        const workspace: WorkspaceRecord = {
            id: randomUUID(),
            name: input.name,
            slug,
            ownerUserId: input.ownerUserId,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        };
        this.store.workspaces.set(workspace.id, workspace);
        this.store.members.set(workspace.id, new Map([[input.ownerUserId, "owner"]]));
        return this.mapWorkspace(workspace, input.ownerUserId);
    }

    async updateWorkspace(id: string, input: { name: string }): Promise<WorkspaceDetail> {
        const workspace = this.store.workspaces.get(id);
        if (!workspace) {
            throw new Error("Workspace not found");
        }
        const updated = { ...workspace, name: input.name, updatedAt: new Date() };
        this.store.workspaces.set(id, updated);
        return this.mapWorkspace(updated, updated.ownerUserId);
    }

    async softDeleteWorkspace(id: string): Promise<WorkspaceDetail> {
        const workspace = this.store.workspaces.get(id);
        if (!workspace) {
            throw new Error("Workspace not found");
        }
        const updated = { ...workspace, deletedAt: new Date(), updatedAt: new Date() };
        this.store.workspaces.set(id, updated);
        return this.mapWorkspace(updated, updated.ownerUserId);
    }

    async ensurePersonalWorkspace(user: { id: string; name: string }): Promise<WorkspaceDetail> {
        const existing = await this.listAllForUser(user.id);
        if (existing[0]) {
            return existing[0];
        }
        return this.createWorkspace({
            ownerUserId: user.id,
            name: personalWorkspaceName(user.name),
        });
    }

    async backfillPersonalWorkspaces(): Promise<number> {
        if (!this.authRepository) {
            return 0;
        }
        let created = 0;
        for (const user of this.authRepository.users.values()) {
            if (user.deletedAt) {
                continue;
            }
            const existing = await this.listAllForUser(user.id);
            if (existing.length === 0) {
                await this.ensurePersonalWorkspace(user);
                created += 1;
            }
        }
        return created;
    }

    async countMembers(workspaceId: string): Promise<number> {
        return this.store.members.get(workspaceId)?.size ?? 0;
    }

    addMember(workspaceId: string, userId: string, role: WorkspaceMemberRole): void {
        const members = this.store.members.get(workspaceId) ?? new Map();
        members.set(userId, role);
        this.store.members.set(workspaceId, members);
    }

    async listSites(
        workspaceId: string,
        query: ListSitesQuery,
    ): Promise<PaginatedResult<SiteSummary>> {
        let rows = [...this.store.sites.values()].filter((site) => site.workspaceId === workspaceId);

        if (query.search) {
            const term = query.search.toLowerCase();
            rows = rows.filter(
                (site) =>
                    site.name.toLowerCase().includes(term) ||
                    site.url.toLowerCase().includes(term) ||
                    site.normalizedUrl.toLowerCase().includes(term),
            );
        }

        switch (query.status) {
            case "active":
                rows = rows.filter((site) => site.deletedAt === null && site.isActive);
                break;
            case "inactive":
                rows = rows.filter((site) => site.deletedAt === null && !site.isActive);
                break;
            case "deleted":
                rows = rows.filter((site) => site.deletedAt !== null);
                break;
            case "all":
                break;
            default:
                rows = rows.filter((site) => site.deletedAt === null);
                break;
        }

        rows.sort((a, b) => {
            const direction = query.direction === "asc" ? 1 : -1;
            const left =
                query.sort === "url"
                    ? a.url
                    : query.sort === "name"
                      ? a.name
                      : query.sort === "updatedAt"
                        ? a.updatedAt.toISOString()
                        : a.createdAt.toISOString();
            const right =
                query.sort === "url"
                    ? b.url
                    : query.sort === "name"
                      ? b.name
                      : query.sort === "updatedAt"
                        ? b.updatedAt.toISOString()
                        : b.createdAt.toISOString();
            return left.localeCompare(right) * direction;
        });

        const total = rows.length;
        const start = (query.page - 1) * query.perPage;
        const pageRows = rows.slice(start, start + query.perPage);

        return {
            items: pageRows.map(mapSite),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / query.perPage),
            },
        };
    }

    async findSiteById(workspaceId: string, siteId: string): Promise<SiteSummary | null> {
        const site = this.store.sites.get(siteId);
        if (!site || site.workspaceId !== workspaceId) {
            return null;
        }
        return mapSite(site);
    }

    async findSiteByNormalizedUrl(
        workspaceId: string,
        normalizedUrl: string,
    ): Promise<SiteSummary | null> {
        const site = [...this.store.sites.values()].find(
            (item) =>
                item.workspaceId === workspaceId &&
                item.normalizedUrl === normalizedUrl &&
                item.deletedAt === null,
        );
        return site ? mapSite(site) : null;
    }

    async createSite(input: {
        workspaceId: string;
        name: string;
        url: string;
        normalizedUrl: string;
    }): Promise<SiteSummary> {
        const now = new Date();
        const site: SiteRecord = {
            id: randomUUID(),
            workspaceId: input.workspaceId,
            name: input.name,
            url: input.url,
            normalizedUrl: input.normalizedUrl,
            isActive: true,
            lastScannedAt: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        };
        this.store.sites.set(site.id, site);
        return mapSite(site);
    }

    async updateSite(
        workspaceId: string,
        siteId: string,
        input: { name?: string; url?: string; normalizedUrl?: string; isActive?: boolean },
    ): Promise<SiteSummary> {
        const site = this.store.sites.get(siteId);
        if (!site || site.workspaceId !== workspaceId) {
            throw new Error("Site not found");
        }
        const updated = {
            ...site,
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.url !== undefined ? { url: input.url } : {}),
            ...(input.normalizedUrl !== undefined ? { normalizedUrl: input.normalizedUrl } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            updatedAt: new Date(),
        };
        this.store.sites.set(siteId, updated);
        return mapSite(updated);
    }

    async softDeleteSite(workspaceId: string, siteId: string): Promise<SiteSummary> {
        return this.patchSite(workspaceId, siteId, { deletedAt: new Date() });
    }

    async restoreSite(workspaceId: string, siteId: string): Promise<SiteSummary> {
        return this.patchSite(workspaceId, siteId, { deletedAt: null });
    }

    private async patchSite(
        workspaceId: string,
        siteId: string,
        patch: Partial<SiteRecord>,
    ): Promise<SiteSummary> {
        const site = this.store.sites.get(siteId);
        if (!site || site.workspaceId !== workspaceId) {
            throw new Error("Site not found");
        }
        const updated = { ...site, ...patch, updatedAt: new Date() };
        this.store.sites.set(siteId, updated);
        return mapSite(updated);
    }

    private mapWorkspace(workspace: WorkspaceRecord, userId: string): WorkspaceSummary {
        return {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            ownerUserId: workspace.ownerUserId,
            role: this.store.members.get(workspace.id)?.get(userId) ?? "member",
            membersCount: this.store.members.get(workspace.id)?.size ?? 0,
            createdAt: workspace.createdAt.toISOString(),
            updatedAt: workspace.updatedAt.toISOString(),
        };
    }
}

function mapSite(site: SiteRecord): SiteSummary {
    return {
        id: site.id,
        workspaceId: site.workspaceId,
        name: site.name,
        url: site.url,
        normalizedUrl: site.normalizedUrl,
        isActive: site.isActive,
        lastScannedAt: site.lastScannedAt ? site.lastScannedAt.toISOString() : null,
        deletedAt: site.deletedAt ? site.deletedAt.toISOString() : null,
        createdAt: site.createdAt.toISOString(),
        updatedAt: site.updatedAt.toISOString(),
    };
}

export function ensureMemoryPersonalWorkspace(
    store: MemoryWorkspaceStore,
    user: { id: string; name: string },
): void {
    const alreadyMember = [...store.members.values()].some((members) => members.has(user.id));
    if (alreadyMember) {
        return;
    }

    const created = buildPersonalWorkspace(
        user,
        [...store.workspaces.values()].map((item) => item.slug),
    );
    const now = new Date();
    store.workspaces.set(created.id, {
        id: created.id,
        name: created.name,
        slug: created.slug,
        ownerUserId: created.ownerUserId,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
    });
    store.members.set(created.id, new Map([[user.id, "owner"]]));
}
