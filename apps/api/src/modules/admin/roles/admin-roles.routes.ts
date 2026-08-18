import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";

import {
    createAuthMiddleware,
    createRequireAllPermissions,
} from "../../../middleware/auth.middleware.js";
import type { AuthService } from "../../auth/auth.service.js";
import { SYSTEM_PERMISSIONS } from "../../auth/rbac/system-permissions.js";
import type { PermissionName } from "../../auth/auth.types.js";
import type { AdminRolesController } from "./admin-roles.controller.js";

type AdminRolesRoutesOptions = {
    controller: AdminRolesController;
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

export const adminRolesRoutes: FastifyPluginAsync<AdminRolesRoutesOptions> = async (
    app,
    options,
) => {
    const { controller, authService } = options;

    app.get(
        "/roles",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.ROLES_VIEW) },
        controller.list,
    );
    app.get(
        "/roles/:id",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.ROLES_VIEW) },
        controller.get,
    );
    app.post(
        "/roles",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.ROLES_CREATE) },
        controller.create,
    );
    app.patch(
        "/roles/:id",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.ROLES_UPDATE) },
        controller.update,
    );
    app.delete(
        "/roles/:id",
        { preHandler: adminHandlers(authService, SYSTEM_PERMISSIONS.ROLES_DELETE) },
        controller.remove,
    );
    app.put(
        "/roles/:id/permissions",
        {
            preHandler: adminHandlers(
                authService,
                SYSTEM_PERMISSIONS.ROLES_PERMISSIONS_MANAGE,
            ),
        },
        controller.syncPermissions,
    );
};
