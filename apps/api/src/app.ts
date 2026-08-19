import Fastify, { type FastifyInstance } from "fastify";

import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";

import { getApiEnv, isAllowedFrontendOrigin } from "./config/env.js";
import { authPlugin, type AuthPluginOptions } from "./plugins/auth.plugin.js";
import { registerErrorHandler } from "./plugins/error-handler.js";
import "./types/fastify.js";

export type BuildAppOptions = AuthPluginOptions;

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
    const env = getApiEnv();
    const app = Fastify({
        logger: {
            level: process.env.LOG_LEVEL ?? "info",
            redact: ["req.headers.authorization", "req.headers.cookie", "req.headers.set-cookie"],
        },
        trustProxy: true,
    });

    registerErrorHandler(app);

    await app.register(helmet);
    await app.register(cors, {
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            callback(null, isAllowedFrontendOrigin(origin, env.allowedFrontendOrigins));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });
    await app.register(cookie);

    app.get("/health", async () => ({
        success: true,
        data: {
            status: "ok",
        },
    }));

    await app.register(authPlugin, options);

    return app;
}
