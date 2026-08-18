import type { FastifyRequest } from "fastify";

import { unauthenticatedError } from "../modules/auth/auth.errors.js";
import type { AuthService } from "../modules/auth/auth.service.js";

export function createAuthMiddleware(service: AuthService) {
    return async function authenticate(request: FastifyRequest): Promise<void> {
        const header = request.headers.authorization;

        if (!header || !header.startsWith("Bearer ")) {
            throw unauthenticatedError();
        }

        const accessToken = header.slice("Bearer ".length).trim();

        if (accessToken.length === 0) {
            throw unauthenticatedError();
        }

        const { user, sessionId } = await service.authenticateAccessToken(accessToken);
        request.auth = { user, sessionId };
    };
}
