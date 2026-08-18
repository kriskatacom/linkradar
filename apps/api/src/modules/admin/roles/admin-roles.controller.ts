import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";

import { validationError } from "../../auth/auth.errors.js";
import {
    createRoleBodySchema,
    listRolesQuerySchema,
    roleIdParamsSchema,
    syncRolePermissionsBodySchema,
    updateRoleBodySchema,
} from "../admin.schemas.js";
import type { AdminRolesService } from "./admin-roles.service.js";

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

export class AdminRolesController {
    constructor(private readonly service: AdminRolesService) {}

    list = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = listRolesQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        const result = await this.service.listRoles(parsed.data);
        return reply.send({ success: true, data: result });
    };

    get = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = roleIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }

        const role = await this.service.getRole(params.data.id);
        return reply.send({ success: true, data: { role } });
    };

    create = async (request: FastifyRequest, reply: FastifyReply) => {
        const body = createRoleBodySchema.safeParse(request.body);
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }

        const role = await this.service.createRole(body.data);
        return reply.status(201).send({ success: true, data: { role } });
    };

    update = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = roleIdParamsSchema.safeParse(request.params);
        const body = updateRoleBodySchema.safeParse(request.body);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }

        const role = await this.service.updateRole(params.data.id, body.data);
        return reply.send({ success: true, data: { role } });
    };

    remove = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = roleIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }

        await this.service.deleteRole(params.data.id);
        return reply.send({ success: true, data: { deleted: true } });
    };

    syncPermissions = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = roleIdParamsSchema.safeParse(request.params);
        const body = syncRolePermissionsBodySchema.safeParse(request.body);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }

        const role = await this.service.syncRolePermissions(params.data.id, body.data.permissions);
        return reply.send({ success: true, data: { role } });
    };
}
