import rateLimit from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";

import { getApiEnv } from "../config/env.js";
import { AuthController } from "../modules/auth/auth.controller.js";
import type { AuthRepository } from "../modules/auth/auth.repository.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { AuthService } from "../modules/auth/auth.service.js";
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

export type AuthPluginOptions = {
    repository?: AuthRepository;
    socialRepository?: SocialAuthRepository;
    socialProfileFetcher?: SocialProfileFetcher;
    oauthAdapter?: SocialOAuthAdapter;
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
    const service = new AuthService(repository);
    const socialAuthService = new SocialAuthService(repository, socialRepository, service);
    const controller = new AuthController(service);
    const profileFetcher = options.socialProfileFetcher ?? new HttpSocialProfileFetcher();

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
};
