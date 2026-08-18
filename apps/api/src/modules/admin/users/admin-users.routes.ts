import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";

import {
    createAuthMiddleware,
    createRequireAllPermissions,
} from "../../../middleware/auth.middleware.js";
import type { AuthService } from "../../auth/auth.service.js";
import { SYSTEM_PERMISSIONS } from "../../auth/rbac/system-permissions.js";
import type { PermissionName } from "../../auth/auth.types.js";
import type { AdminUsersController } from "./admin-users.controller.js";

type AdminUsersRoutesOptions = {
    controller: AdminUsersController;
    authService: AuthService;
};

function adminHandlers(
    authService: AuthService,
    permission: PermissionName,
): preHandlerHookHandler[] {
    return [
        createAuthMiddleware(authService),
        createRequireAllPermissions([SYSTEM_PERMISSIONS.ADMIN_ACCESS, permission]),
    ];
}

export const adminUsersRoutes: FastifyPluginAsync<AdminUsersRoutesOptions> = async (
    app,
    options,
) => {
    const { controller, authService } = options;

    app.get(
        "/users",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_VIEW) },
        controller.list,
    );
    app.get(
        "/users/:id",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_VIEW) },
        controller.get,
    );
    app.patch(
        "/users/:id",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_UPDATE) },
        controller.update,
    );
    app.delete(
        "/users/:id",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_DELETE) },
        controller.remove,
    );
    app.post(
        "/users/:id/restore",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_UPDATE) },
        controller.restore,
    );
    app.post(
        "/users/:id/activate",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_UPDATE) },
        controller.activate,
    );
    app.post(
        "/users/:id/deactivate",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_UPDATE) },
        controller.deactivate,
    );
    app.put(
        "/users/:id/roles",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.USERS_ROLES_MANAGE) },
        controller.syncRoles,
    );
};
