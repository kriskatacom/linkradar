import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";

import {
    createAuthMiddleware,
    createRequireAllPermissions,
} from "../../middleware/auth.middleware.js";
import type { AuthService } from "../auth/auth.service.js";
import { SYSTEM_PERMISSIONS } from "../auth/rbac/system-permissions.js";
import {
    AdminPermissionsController,
    AdminStatsController,
} from "./stats/admin-stats.controller.js";

type AdminMiscRoutesOptions = {
    permissionsController: AdminPermissionsController;
    statsController: AdminStatsController;
    authService: AuthService;
};

function adminHandlers(
    authService: AuthService,
    permission: (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS],
): preHandlerHookHandler[] {
    return [
        createAuthMiddleware(authService),
        createRequireAllPermissions([SYSTEM_PERMISSIONS.ADMIN_ACCESS, permission]),
    ];
}

export const adminMiscRoutes: FastifyPluginAsync<AdminMiscRoutesOptions> = async (app, options) => {
    const { permissionsController, statsController, authService } = options;

    app.get(
        "/permissions",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.ROLES_VIEW) },
        permissionsController.list,
    );
    app.get(
        "/stats",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.ADMIN_ACCESS) },
        statsController.get,
    );
};
