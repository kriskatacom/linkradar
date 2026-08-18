import type { FastifyInstance } from "fastify";

import { AuthError } from "../modules/auth/auth.errors.js";

export function registerErrorHandler(app: FastifyInstance): void {
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof AuthError) {
            request.log.warn({ errCode: error.code, statusCode: error.statusCode }, error.message);

            return reply.status(error.statusCode).send({
                success: false,
                error: {
                    code: error.code,
                    message: error.message,
                    ...(error.fields ? { fields: error.fields } : {}),
                },
            });
        }

        const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error &&
            typeof error.statusCode === "number"
                ? error.statusCode
                : 500;

        if (statusCode === 429) {
            request.log.warn({ statusCode }, "Rate limit exceeded");

            return reply.status(429).send({
                success: false,
                error: {
                    code: "RATE_LIMITED",
                    message: "Too many requests. Please try again later.",
                },
            });
        }

        request.log.error({ err: error, errCode: "INTERNAL_ERROR" }, "Unhandled error");

        return reply.status(500).send({
            success: false,
            error: {
                code: "INTERNAL_ERROR",
                message: "Internal server error.",
            },
        });
    });
}
