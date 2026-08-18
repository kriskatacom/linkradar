import { db, sites, users, workspaceMembers, workspaces } from "@link-radar/database";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, like, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { personalWorkspaceName, uniqueWorkspaceSlug } from "./personal-workspace.js";
import type { WorkspaceRepository } from "./workspace.repository.js";
import type {
    ListSitesQuery,
    ListWorkspacesQuery,
    PaginatedResult,
    SiteRow,
    SiteSummary,
    WorkspaceDetail,
    WorkspaceMemberRole,
    WorkspaceRow,
    WorkspaceSummary,
} from "./workspace.types.js";
import type { WorkspaceMembership } from "./workspace.repository.js";

function toIso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
}

function mapWorkspace(
    row: WorkspaceRow,
    role: WorkspaceMemberRole,
    membersCount: number,
): WorkspaceSummary {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        ownerUserId: row.ownerUserId,
        role,
        membersCount,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function mapSite(row: SiteRow): SiteSummary {
    return {
        id: row.id,
        workspaceId: row.workspaceId,
        name: row.name,
        url: row.url,
        normalizedUrl: row.normalizedUrl,
        isActive: row.isActive,
        lastScannedAt: toIso(row.lastScannedAt),
        deletedAt: toIso(row.deletedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

export class DrizzleWorkspaceRepository implements WorkspaceRepository {
    async listForUser(
        userId: string,
        query: ListWorkspacesQuery,
    ): Promise<PaginatedResult<WorkspaceSummary>> {
        const memberships = await db
            .select({
                workspaceId: workspaceMembers.workspaceId,
                role: workspaceMembers.role,
            })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.userId, userId));

        const workspaceIds = memberships.map((row) => row.workspaceId);
        if (workspaceIds.length === 0) {
            return emptyPage(query.page, query.perPage);
        }

        const roleByWorkspace = new Map(
            memberships.map((row) => [row.workspaceId, row.role as WorkspaceMemberRole]),
        );

        const conditions = [
            inArray(workspaces.id, workspaceIds),
            isNull(workspaces.deletedAt),
        ];
        if (query.search) {
            const term = `%${query.search}%`;
            conditions.push(or(like(workspaces.name, term), like(workspaces.slug, term))!);
        }

        const whereClause = and(...conditions);
        const [totalRow] = await db.select({ value: count() }).from(workspaces).where(whereClause);
        const total = Number(totalRow?.value ?? 0);
        const offset = (query.page - 1) * query.perPage;

        const rows = await db
            .select()
            .from(workspaces)
            .where(whereClause)
            .orderBy(asc(workspaces.name))
            .limit(query.perPage)
            .offset(offset);

        const items = await Promise.all(
            rows.map(async (row) =>
                mapWorkspace(
                    row,
                    roleByWorkspace.get(row.id) ?? "member",
                    await this.countMembers(row.id),
                ),
            ),
        );

        return {
            items,
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
        const rows = await db
            .select()
            .from(workspaces)
            .where(and(eq(workspaces.id, id), isNull(workspaces.deletedAt)))
            .limit(1);
        const row = rows[0];
        if (!row) {
            return null;
        }

        return mapWorkspace(row, "member", await this.countMembers(row.id));
    }

    async findMembership(userId: string, workspaceId: string): Promise<WorkspaceMembership | null> {
        const rows = await db
            .select()
            .from(workspaceMembers)
            .where(
                and(eq(workspaceMembers.userId, userId), eq(workspaceMembers.workspaceId, workspaceId)),
            )
            .limit(1);
        const row = rows[0];
        if (!row) {
            return null;
        }

        return {
            workspaceId: row.workspaceId,
            userId: row.userId,
            role: row.role as WorkspaceMemberRole,
        };
    }

    async createWorkspace(input: {
        ownerUserId: string;
        name: string;
        slug?: string;
    }): Promise<WorkspaceDetail> {
        const slugs = await db.select({ slug: workspaces.slug }).from(workspaces);
        const slug = input.slug ?? uniqueWorkspaceSlug(input.name, new Set(slugs.map((row) => row.slug)));
        const id = randomUUID();

        await db.transaction(async (tx) => {
            await tx.insert(workspaces).values({
                id,
                name: input.name,
                slug,
                ownerUserId: input.ownerUserId,
            });
            await tx.insert(workspaceMembers).values({
                workspaceId: id,
                userId: input.ownerUserId,
                role: "owner",
            });
        });

        const workspace = await this.findById(id);
        if (!workspace) {
            throw new Error("Failed to load created workspace.");
        }
        return { ...workspace, role: "owner" };
    }

    async updateWorkspace(id: string, input: { name: string }): Promise<WorkspaceDetail> {
        await db.update(workspaces).set({ name: input.name }).where(eq(workspaces.id, id));
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error("Failed to load updated workspace.");
        }
        return updated;
    }

    async softDeleteWorkspace(id: string): Promise<WorkspaceDetail> {
        await db.update(workspaces).set({ deletedAt: new Date() }).where(eq(workspaces.id, id));
        const rows = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
        if (!rows[0]) {
            throw new Error("Failed to load deleted workspace.");
        }
        return mapWorkspace(rows[0], "owner", await this.countMembers(id));
    }

    async ensurePersonalWorkspace(user: { id: string; name: string }): Promise<WorkspaceDetail> {
        const existing = await this.listAllForUser(user.id);
        if (existing.length > 0) {
            return existing[0]!;
        }

        return this.createWorkspace({
            ownerUserId: user.id,
            name: personalWorkspaceName(user.name),
        });
    }

    async backfillPersonalWorkspaces(): Promise<number> {
        const allUsers = await db
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(isNull(users.deletedAt));

        let created = 0;
        for (const user of allUsers) {
            const memberships = await db
                .select({ workspaceId: workspaceMembers.workspaceId })
                .from(workspaceMembers)
                .where(eq(workspaceMembers.userId, user.id))
                .limit(1);
            if (memberships.length === 0) {
                await this.ensurePersonalWorkspace(user);
                created += 1;
            }
        }

        return created;
    }

    async countMembers(workspaceId: string): Promise<number> {
        const [row] = await db
            .select({ value: count() })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, workspaceId));
        return Number(row?.value ?? 0);
    }

    async listSites(
        workspaceId: string,
        query: ListSitesQuery,
    ): Promise<PaginatedResult<SiteSummary>> {
        const conditions = [eq(sites.workspaceId, workspaceId)];

        if (query.search) {
            const term = `%${query.search}%`;
            conditions.push(
                or(like(sites.name, term), like(sites.url, term), like(sites.normalizedUrl, term))!,
            );
        }

        switch (query.status) {
            case "active":
                conditions.push(and(isNull(sites.deletedAt), eq(sites.isActive, true))!);
                break;
            case "inactive":
                conditions.push(and(isNull(sites.deletedAt), eq(sites.isActive, false))!);
                break;
            case "deleted":
                conditions.push(isNotNull(sites.deletedAt));
                break;
            case "all":
                break;
            default:
                conditions.push(isNull(sites.deletedAt));
                break;
        }

        const whereClause = and(...conditions);
        const orderColumn =
            query.sort === "url"
                ? sites.url
                : query.sort === "createdAt"
                  ? sites.createdAt
                  : query.sort === "updatedAt"
                    ? sites.updatedAt
                    : sites.name;
        const orderBy = query.direction === "desc" ? desc(orderColumn) : asc(orderColumn);
        const [totalRow] = await db.select({ value: count() }).from(sites).where(whereClause);
        const total = Number(totalRow?.value ?? 0);
        const offset = (query.page - 1) * query.perPage;

        const rows = await db
            .select()
            .from(sites)
            .where(whereClause)
            .orderBy(orderBy)
            .limit(query.perPage)
            .offset(offset);

        return {
            items: rows.map(mapSite),
            pagination: {
                page: query.page,
                perPage: query.perPage,
                total,
                totalPages: total === 0 ? 0 : Math.ceil(total / query.perPage),
            },
        };
    }

    async findSiteById(workspaceId: string, siteId: string): Promise<SiteSummary | null> {
        const rows = await db
            .select()
            .from(sites)
            .where(and(eq(sites.id, siteId), eq(sites.workspaceId, workspaceId)))
            .limit(1);
        return rows[0] ? mapSite(rows[0]) : null;
    }

    async findSiteByNormalizedUrl(
        workspaceId: string,
        normalizedUrl: string,
    ): Promise<SiteSummary | null> {
        const rows = await db
            .select()
            .from(sites)
            .where(
                and(
                    eq(sites.workspaceId, workspaceId),
                    eq(sites.normalizedUrl, normalizedUrl),
                    isNull(sites.deletedAt),
                ),
            )
            .limit(1);
        return rows[0] ? mapSite(rows[0]) : null;
    }

    async createSite(input: {
        workspaceId: string;
        name: string;
        url: string;
        normalizedUrl: string;
    }): Promise<SiteSummary> {
        const id = randomUUID();
        await db.insert(sites).values({
            id,
            workspaceId: input.workspaceId,
            name: input.name,
            url: input.url,
            normalizedUrl: input.normalizedUrl,
            isActive: true,
        });
        const created = await this.findSiteById(input.workspaceId, id);
        if (!created) {
            throw new Error("Failed to load created site.");
        }
        return created;
    }

    async updateSite(
        workspaceId: string,
        siteId: string,
        input: { name?: string; url?: string; normalizedUrl?: string; isActive?: boolean },
    ): Promise<SiteSummary> {
        await db
            .update(sites)
            .set({
                ...(input.name !== undefined ? { name: input.name } : {}),
                ...(input.url !== undefined ? { url: input.url } : {}),
                ...(input.normalizedUrl !== undefined ? { normalizedUrl: input.normalizedUrl } : {}),
                ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            })
            .where(and(eq(sites.id, siteId), eq(sites.workspaceId, workspaceId)));

        const updated = await this.findSiteById(workspaceId, siteId);
        if (!updated) {
            throw new Error("Failed to load updated site.");
        }
        return updated;
    }

    async softDeleteSite(workspaceId: string, siteId: string): Promise<SiteSummary> {
        await db
            .update(sites)
            .set({ deletedAt: new Date() })
            .where(and(eq(sites.id, siteId), eq(sites.workspaceId, workspaceId)));
        const updated = await this.findSiteById(workspaceId, siteId);
        if (!updated) {
            throw new Error("Failed to load deleted site.");
        }
        return updated;
    }

    async restoreSite(workspaceId: string, siteId: string): Promise<SiteSummary> {
        await db
            .update(sites)
            .set({ deletedAt: null })
            .where(and(eq(sites.id, siteId), eq(sites.workspaceId, workspaceId)));
        const updated = await this.findSiteById(workspaceId, siteId);
        if (!updated) {
            throw new Error("Failed to load restored site.");
        }
        return updated;
    }
}

function emptyPage(page: number, perPage: number): PaginatedResult<WorkspaceSummary> {
    return {
        items: [],
        pagination: { page, perPage, total: 0, totalPages: 0 },
    };
}
