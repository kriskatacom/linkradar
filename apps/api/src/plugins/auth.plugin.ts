import rateLimit from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";

import { getApiEnv } from "../config/env.js";
import {
    createAuthMiddleware,
    createRequireAllPermissions,
    createRequireAnyPermission,
    createRequirePermission,
} from "../middleware/auth.middleware.js";
import { AuthController } from "../modules/auth/auth.controller.js";
import type { AuthRepository } from "../modules/auth/auth.repository.js";
import { SYSTEM_PERMISSIONS } from "../modules/auth/rbac/system-permissions.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { AuthService } from "../modules/auth/auth.service.js";
import { defaultMailer } from "../modules/mail/mail.service.js";
import type { Mailer } from "../modules/mail/mail.types.js";
import { HttpSocialProfileFetcher } from "../modules/auth/social/providers/index.js";
import type { SocialAuthRepository } from "../modules/auth/social/social-auth.repository.js";
import { socialAuthRoutes } from "../modules/auth/social/social-auth.routes.js";
import { SocialAuthService } from "../modules/auth/social/social-auth.service.js";
import {
    FastifySocialOAuthAdapter,
    registerConfiguredOAuthProviders,
} from "../modules/auth/social/social-oauth.plugin.js";
import type {
    SocialOAuthAdapter,
    SocialProfileFetcher,
} from "../modules/auth/social/social-auth.types.js";
import { adminPlugin } from "../modules/admin/admin.plugin.js";
import type { AdminRepository } from "../modules/admin/admin.repository.js";
import { workspacePlugin } from "../modules/workspaces/workspace.plugin.js";
import type { WorkspaceRepository } from "../modules/workspaces/workspace.repository.js";

export type AuthPluginOptions = {
    repository?: AuthRepository;
    socialRepository?: SocialAuthRepository;
    socialProfileFetcher?: SocialProfileFetcher;
    oauthAdapter?: SocialOAuthAdapter;
    adminRepository?: AdminRepository;
    workspaceRepository?: WorkspaceRepository;
    mailer?: Mailer;
};

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, options) => {
    const env = getApiEnv();
    const repository =
        options.repository ??
        new (await import("../modules/auth/auth.repository.drizzle.js")).DrizzleAuthRepository();
    const socialRepository =
        options.socialRepository ??
        (options.repository && "findByProviderIdentity" in options.repository
            ? (options.repository as AuthRepository & SocialAuthRepository)
            : new (
                  await import("../modules/auth/social/social-auth.repository.drizzle.js")
              ).DrizzleSocialAuthRepository());
    const service = new AuthService(repository, options.mailer ?? defaultMailer());
    const socialAuthService = new SocialAuthService(repository, socialRepository, service);
    const controller = new AuthController(service);
    const profileFetcher = options.socialProfileFetcher ?? new HttpSocialProfileFetcher();
    await repository.ensureRbacBootstrap();
    const authenticate = createAuthMiddleware(service);
    const requireAdminAccess = createRequirePermission(SYSTEM_PERMISSIONS.ADMIN_ACCESS);
    const requireSitesView = createRequirePermission(SYSTEM_PERMISSIONS.SITES_VIEW);
    const requireAnyUserManage = createRequireAnyPermission([
        SYSTEM_PERMISSIONS.USERS_UPDATE,
        SYSTEM_PERMISSIONS.USERS_ROLES_MANAGE,
    ]);
    const requireSiteReadWrite = createRequireAllPermissions([
        SYSTEM_PERMISSIONS.SITES_VIEW,
        SYSTEM_PERMISSIONS.SITES_UPDATE,
    ]);

    await app.register(
        async (authApp) => {
            if (!options.oauthAdapter) {
                await registerConfiguredOAuthProviders(authApp);
            }

            const oauthAdapter = options.oauthAdapter ?? new FastifySocialOAuthAdapter(authApp);

            await authApp.register(rateLimit, {
                max: env.rateLimitMax,
                timeWindow: "1 minute",
            });
            await authApp.register(authRoutes, { controller, service });
            await authApp.register(socialAuthRoutes, {
                socialAuthService,
                oauthAdapter,
                profileFetcher,
            });
        },
        { prefix: "/api/auth" },
    );

    await app.register(
        async (adminApp) => {
            adminApp.get("/test", { preHandler: [authenticate, requireAdminAccess] }, async () => ({
                success: true,
                data: {
                    message: "Admin access granted.",
                },
            }));

            await adminApp.register(adminPlugin, {
                repository: options.adminRepository,
                authService: service,
            });
        },
        { prefix: "/api/admin" },
    );

    await app.register(
        async (permissionApp) => {
            permissionApp.get(
                "/sites-view",
                { preHandler: [authenticate, requireSitesView] },
                async () => ({
                    success: true,
                    data: { message: "Sites view access granted." },
                }),
            );

            permissionApp.get(
                "/users-manage-any",
                { preHandler: [authenticate, requireAnyUserManage] },
                async () => ({
                    success: true,
                    data: { message: "User management permission granted." },
                }),
            );

            permissionApp.get(
                "/sites-read-write",
                { preHandler: [authenticate, requireSiteReadWrite] },
                async () => ({
                    success: true,
                    data: { message: "Site read/write permissions granted." },
                }),
            );
        },
        { prefix: "/api/permissions/test" },
    );

    await app.register(workspacePlugin, {
        prefix: "/api",
        repository: options.workspaceRepository,
        authService: service,
    });
};
