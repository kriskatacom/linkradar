import { z } from "zod";

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import { getApiEnv } from "../../../config/env.js";
import { clearRefreshCookie, requestContext, setRefreshCookie } from "../../../lib/auth-cookies.js";
import { AuthError, invalidOAuthStateError, invalidSocialProviderError } from "../auth.errors.js";
import type { SocialAuthService } from "./social-auth.service.js";
import {
    isSocialProvider,
    type SocialOAuthAdapter,
    type SocialProfileFetcher,
    type SocialProvider,
} from "./social-auth.types.js";

const callbackQuerySchema = z.object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    error: z.string().optional(),
});

export function parseOAuthCallbackQuery(query: unknown): { code: string; state: string } {
    const parsed = callbackQuerySchema.parse(query ?? {});

    if (!parsed.state) {
        throw invalidOAuthStateError();
    }

    if (parsed.error || !parsed.code) {
        throw invalidOAuthStateError();
    }

    return { code: parsed.code, state: parsed.state };
}

type SocialRoutesOptions = {
    socialAuthService: SocialAuthService;
    oauthAdapter: SocialOAuthAdapter;
    profileFetcher: SocialProfileFetcher;
};

function oauthErrorRedirect(error: unknown): string {
    const frontendUrl = getApiEnv().frontendUrl;

    if (error instanceof AuthError) {
        if (error.code === "SOCIAL_ACCOUNT_LINK_REQUIRED") {
            return `${frontendUrl}/login?error=social_account_link_required`;
        }

        if (error.code === "SOCIAL_EMAIL_REQUIRED") {
            return `${frontendUrl}/login?error=social_email_required`;
        }

        if (error.code === "ACCOUNT_DISABLED") {
            return `${frontendUrl}/login?error=account_disabled`;
        }
    }

    return `${frontendUrl}/login?error=oauth_failed`;
}

function readProvider(request: FastifyRequest): SocialProvider {
    const provider = (request.params as { provider?: string }).provider ?? "";

    if (!isSocialProvider(provider)) {
        throw invalidSocialProviderError();
    }

    return provider;
}

export const socialAuthRoutes: FastifyPluginAsync<SocialRoutesOptions> = async (app, options) => {
    app.get("/social/:provider", async (request: FastifyRequest, reply: FastifyReply) => {
        const provider = readProvider(request);

        if (!options.oauthAdapter.isConfigured(provider)) {
            return reply.redirect(oauthErrorRedirect(invalidSocialProviderError()));
        }

        const authorizationUrl = await options.oauthAdapter.createAuthorizationUrl(
            provider,
            request,
            reply,
        );

        return reply.redirect(authorizationUrl);
    });

    app.get("/social/:provider/callback", async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const provider = readProvider(request);
            parseOAuthCallbackQuery(request.query);

            const accessToken = await options.oauthAdapter.exchangeAuthorizationCode(
                provider,
                request,
                reply,
            );
            const profile = await options.profileFetcher.fetchProfile(provider, accessToken);
            const result = await options.socialAuthService.loginWithProfile(
                profile,
                requestContext(request),
            );

            setRefreshCookie(reply, result.refreshToken);
            return reply.redirect(`${getApiEnv().frontendUrl}/auth/callback`);
        } catch (error) {
            if (error instanceof AuthError && error.code === "INVALID_SOCIAL_PROVIDER") {
                throw error;
            }

            request.log.warn(
                {
                    errCode: error instanceof AuthError ? error.code : "OAUTH_FAILED",
                },
                "Social authentication failed",
            );
            clearRefreshCookie(reply);
            return reply.redirect(oauthErrorRedirect(error));
        }
    });
};
