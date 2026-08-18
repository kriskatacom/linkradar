import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";

import { validationError } from "../auth/auth.errors.js";
import {
    createSiteBodySchema,
    createWorkspaceBodySchema,
    listSitesQuerySchema,
    listWorkspacesQuerySchema,
    updateSiteBodySchema,
    updateWorkspaceBodySchema,
    workspaceIdParamsSchema,
    workspaceSiteParamsSchema,
} from "./workspace.schemas.js";
import type { SiteService } from "./site.service.js";
import type { WorkspaceService } from "./workspace.service.js";

function fieldsFromZodError(error: ZodError): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    for (const issue of error.issues) {
        const key = issue.path.map(String).join(".") || "root";
        const messages = fields[key] ?? [];
        messages.push(issue.message);
        fields[key] = messages;
    }
    return fields;
}

function actorId(request: FastifyRequest): string {
    return request.auth?.user.id ?? "";
}

export class WorkspaceController {
    constructor(private readonly service: WorkspaceService) {}

    list = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = listWorkspacesQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }
        const result = await this.service.listForUser(actorId(request), parsed.data);
        return reply.send({ success: true, data: result });
    };

    get = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        const workspace = await this.service.getWorkspace(actorId(request), params.data.id);
        return reply.send({ success: true, data: { workspace } });
    };

    create = async (request: FastifyRequest, reply: FastifyReply) => {
        const body = createWorkspaceBodySchema.safeParse(request.body);
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }
        const workspace = await this.service.createWorkspace(actorId(request), body.data.name);
        return reply.status(201).send({ success: true, data: { workspace } });
    };

    update = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceIdParamsSchema.safeParse(request.params);
        const body = updateWorkspaceBodySchema.safeParse(request.body);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }
        const workspace = await this.service.updateWorkspace(
            actorId(request),
            params.data.id,
            body.data.name,
        );
        return reply.send({ success: true, data: { workspace } });
    };

    remove = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        const workspace = await this.service.deleteWorkspace(actorId(request), params.data.id);
        return reply.send({ success: true, data: { workspace } });
    };
}

export class SiteController {
    constructor(private readonly service: SiteService) {}

    list = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceSiteParamsSchema.safeParse(request.params);
        const query = listSitesQuerySchema.safeParse(request.query);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        if (!query.success) {
            throw validationError(fieldsFromZodError(query.error));
        }
        const result = await this.service.listSites(
            actorId(request),
            params.data.workspaceId,
            query.data,
        );
        return reply.send({ success: true, data: result });
    };

    get = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceSiteParamsSchema.safeParse(request.params);
        if (!params.success || !params.data.siteId) {
            throw validationError(params.success ? { siteId: ["Required"] } : fieldsFromZodError(params.error));
        }
        const site = await this.service.getSite(
            actorId(request),
            params.data.workspaceId,
            params.data.siteId,
        );
        return reply.send({ success: true, data: { site } });
    };

    create = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceSiteParamsSchema.safeParse(request.params);
        const body = createSiteBodySchema.safeParse(request.body);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }
        const site = await this.service.createSite(
            actorId(request),
            params.data.workspaceId,
            body.data,
        );
        return reply.status(201).send({ success: true, data: { site } });
    };

    update = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceSiteParamsSchema.safeParse(request.params);
        const body = updateSiteBodySchema.safeParse(request.body);
        if (!params.success || !params.data.siteId) {
            throw validationError(params.success ? { siteId: ["Required"] } : fieldsFromZodError(params.error));
        }
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }
        const site = await this.service.updateSite(
            actorId(request),
            params.data.workspaceId,
            params.data.siteId,
            body.data,
        );
        return reply.send({ success: true, data: { site } });
    };

    remove = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceSiteParamsSchema.safeParse(request.params);
        if (!params.success || !params.data.siteId) {
            throw validationError(params.success ? { siteId: ["Required"] } : fieldsFromZodError(params.error));
        }
        const site = await this.service.deleteSite(
            actorId(request),
            params.data.workspaceId,
            params.data.siteId,
        );
        return reply.send({ success: true, data: { site } });
    };

    restore = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = workspaceSiteParamsSchema.safeParse(request.params);
        if (!params.success || !params.data.siteId) {
            throw validationError(params.success ? { siteId: ["Required"] } : fieldsFromZodError(params.error));
        }
        const site = await this.service.restoreSite(
            actorId(request),
            params.data.workspaceId,
            params.data.siteId,
        );
        return reply.send({ success: true, data: { site } });
    };
}
