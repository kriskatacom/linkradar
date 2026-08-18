import type { AuthenticatedUser } from "../modules/auth/auth.types.js";

import "@fastify/cookie";

declare module "fastify" {
    interface FastifyRequest {
        auth?: {
            user: AuthenticatedUser;
            sessionId: string;
        };
    }
}

export {};
