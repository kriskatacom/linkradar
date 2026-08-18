import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";

import {
    clearRefreshCookie,
    readRefreshToken,
    requestContext,
    setRefreshCookie,
} from "../../lib/auth-cookies.js";
import { AuthError, unauthenticatedError, validationError } from "./auth.errors.js";
import { loginBodySchema, registerBodySchema } from "./auth.schemas.js";
import type { AuthService } from "./auth.service.js";

function fieldsFromZodError(error: ZodError): Record<string, string[]> {
    const fields: Record<string, string[]> = {};

    for (const issue of error.issues) {
        const key = issue.path.map(String).join(".") || "root";
        const messages = fields[key] ?? [];
        messages.push(issue.message);
        fields[key] = messages;
    }

    return fields;
}

export class AuthController {
    constructor(private readonly service: AuthService) {}

    register = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = registerBodySchema.safeParse(request.body);

        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        const result = await this.service.register(parsed.data, requestContext(request));
        setRefreshCookie(reply, result.refreshToken);

        return reply.status(201).send({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    };

    login = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = loginBodySchema.safeParse(request.body);

        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        const result = await this.service.login(parsed.data, requestContext(request));
        setRefreshCookie(reply, result.refreshToken);

        return reply.status(200).send({
            success: true,
            data: {
                user: result.user,
                accessToken: result.accessToken,
            },
        });
    };

    refresh = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const result = await this.service.refresh(readRefreshToken(request));
            setRefreshCookie(reply, result.refreshToken);

            return reply.status(200).send({
                success: true,
                data: {
                    user: result.user,
                    accessToken: result.accessToken,
                },
            });
        } catch (error) {
            if (error instanceof AuthError && error.code === "INVALID_REFRESH_TOKEN") {
                clearRefreshCookie(reply);
            }

            throw error;
        }
    };

    logout = async (request: FastifyRequest, reply: FastifyReply) => {
        await this.service.logout(readRefreshToken(request));
        clearRefreshCookie(reply);

        return reply.status(200).send({
            success: true,
            data: {
                loggedOut: true,
            },
        });
    };

    me = async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = request.auth;

        if (!auth) {
            throw unauthenticatedError();
        }

        return reply.status(200).send({
            success: true,
            data: {
                user: auth.user,
            },
        });
    };
}
