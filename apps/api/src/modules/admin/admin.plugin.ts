import type { FastifyPluginAsync } from "fastify";

import type { AuthService } from "../auth/auth.service.js";
import type { AdminRepository } from "./admin.repository.js";
import { DrizzleAdminRepository } from "./admin.repository.drizzle.js";
import { adminMiscRoutes } from "./admin-misc.routes.js";
import { AdminPermissionsService, AdminStatsService } from "./permissions/admin-permissions.service.js";
import { AdminRolesController } from "./roles/admin-roles.controller.js";
import { AdminRolesService } from "./roles/admin-roles.service.js";
import { adminRolesRoutes } from "./roles/admin-roles.routes.js";
import {
    AdminPermissionsController,
    AdminStatsController,
} from "./stats/admin-stats.controller.js";
import { AdminUsersController } from "./users/admin-users.controller.js";
import { AdminUsersService } from "./users/admin-users.service.js";
import { adminUsersRoutes } from "./users/admin-users.routes.js";

export type AdminPluginOptions = {
    repository?: AdminRepository;
    authService: AuthService;
};

export const adminPlugin: FastifyPluginAsync<AdminPluginOptions> = async (app, options) => {
    const repository = options.repository ?? new DrizzleAdminRepository();
    const usersService = new AdminUsersService(repository);
    const rolesService = new AdminRolesService(repository);
    const permissionsService = new AdminPermissionsService(repository);
    const statsService = new AdminStatsService(repository);

    const usersController = new AdminUsersController(usersService);
    const rolesController = new AdminRolesController(rolesService);
    const permissionsController = new AdminPermissionsController(permissionsService);
    const statsController = new AdminStatsController(statsService);

    await app.register(adminUsersRoutes, {
        controller: usersController,
        authService: options.authService,
    });
    await app.register(adminRolesRoutes, {
        controller: rolesController,
        authService: options.authService,
    });
    await app.register(adminMiscRoutes, {
        permissionsController,
        statsController,
        authService: options.authService,
    });
};
