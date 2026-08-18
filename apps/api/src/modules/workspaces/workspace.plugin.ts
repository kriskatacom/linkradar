import type { FastifyPluginAsync } from "fastify";

import type { AuthService } from "../auth/auth.service.js";
import { SiteService } from "./site.service.js";
import { WorkspaceAccessService } from "./workspace-access.service.js";
import { SiteController, WorkspaceController } from "./workspace.controller.js";
import type { WorkspaceRepository } from "./workspace.repository.js";
import { DrizzleWorkspaceRepository } from "./workspace.repository.drizzle.js";
import { workspaceRoutes } from "./workspace.routes.js";
import { WorkspaceService } from "./workspace.service.js";

export type WorkspacePluginOptions = {
    repository?: WorkspaceRepository;
    authService: AuthService;
};

export const workspacePlugin: FastifyPluginAsync<WorkspacePluginOptions> = async (app, options) => {
    const repository = options.repository ?? new DrizzleWorkspaceRepository();
    const access = new WorkspaceAccessService(repository);
    const workspaceService = new WorkspaceService(repository, access);
    const siteService = new SiteService(repository, access);

    await app.register(workspaceRoutes, {
        workspaceController: new WorkspaceController(workspaceService),
        siteController: new SiteController(siteService),
        authService: options.authService,
    });
};
