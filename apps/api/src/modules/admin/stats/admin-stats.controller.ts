import type { FastifyReply } from "fastify";

import type {
    AdminPermissionsService,
    AdminStatsService,
} from "../permissions/admin-permissions.service.js";

export class AdminPermissionsController {
    constructor(private readonly service: AdminPermissionsService) {}

    list = async (_request: unknown, reply: FastifyReply) => {
        const items = await this.service.listPermissions();
        return reply.send({ success: true, data: { items } });
    };
}

export class AdminStatsController {
    constructor(private readonly service: AdminStatsService) {}

    get = async (_request: unknown, reply: FastifyReply) => {
        const stats = await this.service.getStats();
        return reply.send({ success: true, data: { stats } });
    };
}
