import rateLimit from "@fastify/rate-limit";
import type { FastifyPluginAsync } from "fastify";

import { getApiEnv } from "../config/env.js";
import { AuthController } from "../modules/auth/auth.controller.js";
import type { AuthRepository } from "../modules/auth/auth.repository.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { AuthService } from "../modules/auth/auth.service.js";

export type AuthPluginOptions = {
    repository?: AuthRepository;
};

export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, options) => {
    const env = getApiEnv();
    const repository =
        options.repository ??
        new (await import("../modules/auth/auth.repository.drizzle.js")).DrizzleAuthRepository();
    const service = new AuthService(repository);
    const controller = new AuthController(service);

    await app.register(
        async (authApp) => {
            await authApp.register(rateLimit, {
                max: env.rateLimitMax,
                timeWindow: "1 minute",
            });
            await authApp.register(authRoutes, { controller, service });
        },
        { prefix: "/api/auth" },
    );
};
