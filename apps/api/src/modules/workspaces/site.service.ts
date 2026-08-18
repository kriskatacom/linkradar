import { UrlNormalizer } from "@link-radar/url";

import { duplicateSiteError, invalidSiteUrlError, siteNotFoundError } from "./workspace.errors.js";
import type { WorkspaceAccessService } from "./workspace-access.service.js";
import type { WorkspaceRepository } from "./workspace.repository.js";
import type { ListSitesQuery, SiteSummary } from "./workspace.types.js";

const urlNormalizer = new UrlNormalizer();

function normalizeSiteUrl(url: string): string {
    let normalized: string;
    try {
        normalized = urlNormalizer.normalizeSiteUrl(url);
    } catch {
        throw invalidSiteUrlError();
    }

    if (normalized.length > 700) {
        throw invalidSiteUrlError("URL is too long after normalization.");
    }

    return normalized;
}

export class SiteService {
    constructor(
        private readonly repository: WorkspaceRepository,
        private readonly access: WorkspaceAccessService,
    ) {}

    async listSites(userId: string, workspaceId: string, query: ListSitesQuery) {
        await this.access.requireWorkspaceMember(userId, workspaceId);
        return this.repository.listSites(workspaceId, query);
    }

    async getSite(userId: string, workspaceId: string, siteId: string): Promise<SiteSummary> {
        await this.access.requireWorkspaceMember(userId, workspaceId);
        const site = await this.repository.findSiteById(workspaceId, siteId);
        if (!site) {
            throw siteNotFoundError();
        }
        return site;
    }

    async createSite(
        userId: string,
        workspaceId: string,
        input: { name: string; url: string },
    ): Promise<SiteSummary> {
        await this.access.requireWriteSites(userId, workspaceId);
        const normalizedUrl = normalizeSiteUrl(input.url);
        const existing = await this.repository.findSiteByNormalizedUrl(workspaceId, normalizedUrl);
        if (existing) {
            throw duplicateSiteError();
        }

        return this.repository.createSite({
            workspaceId,
            name: input.name,
            url: input.url.trim(),
            normalizedUrl,
        });
    }

    async updateSite(
        userId: string,
        workspaceId: string,
        siteId: string,
        input: { name?: string; url?: string; isActive?: boolean },
    ): Promise<SiteSummary> {
        await this.access.requireWriteSites(userId, workspaceId);
        const site = await this.repository.findSiteById(workspaceId, siteId);
        if (!site || site.deletedAt) {
            throw siteNotFoundError();
        }

        let normalizedUrl: string | undefined;
        if (input.url) {
            normalizedUrl = normalizeSiteUrl(input.url);
            const existing = await this.repository.findSiteByNormalizedUrl(
                workspaceId,
                normalizedUrl,
            );
            if (existing && existing.id !== siteId) {
                throw duplicateSiteError();
            }
        }

        return this.repository.updateSite(workspaceId, siteId, {
            name: input.name,
            url: input.url?.trim(),
            normalizedUrl,
            isActive: input.isActive,
        });
    }

    async deleteSite(userId: string, workspaceId: string, siteId: string) {
        await this.access.requireWriteSites(userId, workspaceId);
        const site = await this.repository.findSiteById(workspaceId, siteId);
        if (!site) {
            throw siteNotFoundError();
        }
        return this.repository.softDeleteSite(workspaceId, siteId);
    }

    async restoreSite(userId: string, workspaceId: string, siteId: string) {
        await this.access.requireWriteSites(userId, workspaceId);
        const site = await this.repository.findSiteById(workspaceId, siteId);
        if (!site) {
            throw siteNotFoundError();
        }
        return this.repository.restoreSite(workspaceId, siteId);
    }
}
