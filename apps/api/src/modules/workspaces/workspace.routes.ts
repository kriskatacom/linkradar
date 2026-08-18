import type { FastifyPluginAsync, preHandlerHookHandler } from "fastify";

import {
    createAuthMiddleware,
    createRequirePermission,
} from "../../middleware/auth.middleware.js";
import type { AuthService } from "../auth/auth.service.js";
import { SYSTEM_PERMISSIONS } from "../auth/rbac/system-permissions.js";
import type { PermissionName } from "../auth/auth.types.js";
import type { SiteController, WorkspaceController } from "./workspace.controller.js";

type WorkspaceRoutesOptions = {
    workspaceController: WorkspaceController;
    siteController: SiteController;
    authService: AuthService;
};

function handlers(
    authService: AuthService,
    permission: PermissionName,
): preHandlerHookHandler[] {
    return [
        createAuthMiddleware(authService),
        createRequirePermission(permission),
    ];
}

export const workspaceRoutes: FastifyPluginAsync<WorkspaceRoutesOptions> = async (app, options) => {
    const { workspaceController, siteController, authService } = options;

    app.get(
        "/workspaces",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_VIEW) },
        workspaceController.list,
    );
    app.get(
        "/workspaces/:id",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_VIEW) },
        workspaceController.get,
    );
    app.post(
        "/workspaces",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_CREATE) },
        workspaceController.create,
    );
    app.patch(
        "/workspaces/:id",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_UPDATE) },
        workspaceController.update,
    );
    app.delete(
        "/workspaces/:id",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_DELETE) },
        workspaceController.remove,
    );

    app.get(
        "/workspaces/:workspaceId/sites",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_VIEW) },
        siteController.list,
    );
    app.post(
        "/workspaces/:workspaceId/sites",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_CREATE) },
        siteController.create,
    );
    app.get(
        "/workspaces/:workspaceId/sites/:siteId",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_VIEW) },
        siteController.get,
    );
    app.patch(
        "/workspaces/:workspaceId/sites/:siteId",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_UPDATE) },
        siteController.update,
    );
    app.delete(
        "/workspaces/:workspaceId/sites/:siteId",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_DELETE) },
        siteController.remove,
    );
    app.post(
        "/workspaces/:workspaceId/sites/:siteId/restore",
        { preHandler: handlers(authService, SYSTEM_PERMISSIONS.SITES_UPDATE) },
        siteController.restore,
    );
};
