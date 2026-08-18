import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";

import { validationError } from "../../auth/auth.errors.js";
import {
    listRolesQuerySchema,
    listUsersQuerySchema,
    roleIdParamsSchema,
    syncRolePermissionsBodySchema,
    syncUserRolesBodySchema,
    updateRoleBodySchema,
    updateUserBodySchema,
    userIdParamsSchema,
    createRoleBodySchema,
} from "../admin.schemas.js";
import type { AdminUsersService } from "./admin-users.service.js";

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

function actorUserId(request: FastifyRequest): string {
    return request.auth?.user.id ?? "";
}

export class AdminUsersController {
    constructor(private readonly service: AdminUsersService) {}

    list = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = listUsersQuerySchema.safeParse(request.query);
        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        const result = await this.service.listUsers(parsed.data);
        return reply.send({ success: true, data: result });
    };

    get = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = userIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }

        const user = await this.service.getUser(params.data.id);
        return reply.send({ success: true, data: { user } });
    };

    update = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = userIdParamsSchema.safeParse(request.params);
        const body = updateUserBodySchema.safeParse(request.body);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }

        const user = await this.service.updateUser(params.data.id, body.data, actorUserId(request));
        return reply.send({ success: true, data: { user } });
    };

    remove = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = userIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }

        const user = await this.service.softDeleteUser(params.data.id, actorUserId(request));
        return reply.send({ success: true, data: { user } });
    };

    restore = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = userIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }

        const user = await this.service.restoreUser(params.data.id);
        return reply.send({ success: true, data: { user } });
    };

    activate = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = userIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }

        const user = await this.service.activateUser(params.data.id);
        return reply.send({ success: true, data: { user } });
    };

    deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = userIdParamsSchema.safeParse(request.params);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }

        const user = await this.service.deactivateUser(params.data.id, actorUserId(request));
        return reply.send({ success: true, data: { user } });
    };

    syncRoles = async (request: FastifyRequest, reply: FastifyReply) => {
        const params = userIdParamsSchema.safeParse(request.params);
        const body = syncUserRolesBodySchema.safeParse(request.body);
        if (!params.success) {
            throw validationError(fieldsFromZodError(params.error));
        }
        if (!body.success) {
            throw validationError(fieldsFromZodError(body.error));
        }

        const user = await this.service.syncUserRoles(
            params.data.id,
            body.data.roles,
            actorUserId(request),
        );
        return reply.send({ success: true, data: { user } });
    };
}
