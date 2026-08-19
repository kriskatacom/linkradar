import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";

import {
    clearRefreshCookie,
    readRefreshToken,
    requestContext,
    setRefreshCookie,
} from "../../lib/auth-cookies.js";
import { AuthError, unauthenticatedError, validationError } from "./auth.errors.js";
import {
    EMAIL_VERIFICATION_REQUEST_MESSAGE,
    FORGOT_PASSWORD_MESSAGE,
    type AuthService,
} from "./auth.service.js";
import {
    emailVerificationRequestBodySchema,
    emailVerificationVerifyBodySchema,
    forgotPasswordBodySchema,
    loginBodySchema,
    registerBodySchema,
    resetPasswordBodySchema,
    updateThemeBodySchema,
} from "./auth.schemas.js";

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

    updateTheme = async (request: FastifyRequest, reply: FastifyReply) => {
        const auth = request.auth;

        if (!auth) {
            throw unauthenticatedError();
        }

        const parsed = updateThemeBodySchema.safeParse(request.body);

        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        const user = await this.service.updateTheme(auth.user.id, parsed.data.theme);

        return reply.status(200).send({
            success: true,
            data: {
                user,
            },
        });
    };

    requestEmailVerification = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = emailVerificationRequestBodySchema.safeParse(request.body ?? {});

        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        if (!request.auth && !parsed.data.email) {
            throw validationError({ email: ["Email is required."] });
        }

        await this.service.requestEmailVerification({
            userId: request.auth?.user.id,
            email: parsed.data.email,
        });

        return reply.status(200).send({
            success: true,
            data: {
                message: EMAIL_VERIFICATION_REQUEST_MESSAGE,
            },
        });
    };

    verifyEmail = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = emailVerificationVerifyBodySchema.safeParse(request.body);

        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        const user = await this.service.verifyEmail(parsed.data.token);

        return reply.status(200).send({
            success: true,
            data: { user },
        });
    };

    forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = forgotPasswordBodySchema.safeParse(request.body);

        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        await this.service.forgotPassword(parsed.data.email);

        return reply.status(200).send({
            success: true,
            data: {
                message: FORGOT_PASSWORD_MESSAGE,
            },
        });
    };

    resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
        const parsed = resetPasswordBodySchema.safeParse(request.body);

        if (!parsed.success) {
            throw validationError(fieldsFromZodError(parsed.error));
        }

        await this.service.resetPassword(parsed.data.token, parsed.data.password);

        return reply.status(200).send({
            success: true,
            data: {
                message: "Your password has been reset. You can sign in with your new password.",
            },
        });
    };
}
