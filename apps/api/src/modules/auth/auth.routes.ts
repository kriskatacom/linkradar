import type { FastifyPluginAsync } from "fastify";

import {
    createAuthMiddleware,
    createOptionalAuthMiddleware,
} from "../../middleware/auth.middleware.js";
import type { AuthController } from "./auth.controller.js";
import type { AuthService } from "./auth.service.js";

type AuthRoutesOptions = {
    controller: AuthController;
    service: AuthService;
};

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, options) => {
    const authenticate = createAuthMiddleware(options.service);
    const optionalAuthenticate = createOptionalAuthMiddleware(options.service);

    app.post("/register", options.controller.register);
    app.post("/login", options.controller.login);
    app.post("/refresh", options.controller.refresh);
    app.post("/logout", options.controller.logout);
    app.get("/me", { preHandler: authenticate }, options.controller.me);
    app.patch("/me", { preHandler: authenticate }, options.controller.updateTheme);
    app.post(
        "/email/verification/request",
        { preHandler: optionalAuthenticate },
        options.controller.requestEmailVerification,
    );
    app.post("/email/verification/verify", options.controller.verifyEmail);
    app.post("/forgot-password", options.controller.forgotPassword);
    app.post("/reset-password", options.controller.resetPassword);
};
