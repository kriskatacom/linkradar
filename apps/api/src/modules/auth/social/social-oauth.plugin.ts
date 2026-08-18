import oauthPlugin from "@fastify/oauth2";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { getApiEnv, type OAuthClientConfig } from "../../../config/env.js";
import { refreshCookieOptions } from "../../../lib/auth-cookies.js";
import { socialProviderNotConfiguredError } from "../auth.errors.js";
import type { SocialOAuthAdapter, SocialProvider } from "./social-auth.types.js";

const OAUTH_DECORATOR: Record<SocialProvider, string> = {
    google: "googleOAuth2",
    facebook: "facebookOAuth2",
    linkedin: "linkedinOAuth2",
    github: "githubOAuth2",
};

type ProviderConfiguration = {
    authorizeHost?: string;
    authorizePath?: string;
    tokenHost: string;
    tokenPath?: string;
};

type OAuth2Module = {
    GOOGLE_CONFIGURATION: ProviderConfiguration;
    FACEBOOK_CONFIGURATION: ProviderConfiguration;
    GITHUB_CONFIGURATION: ProviderConfiguration;
};

const oauth2 = oauthPlugin as unknown as typeof oauthPlugin & OAuth2Module;

const LINKEDIN_OIDC_CONFIGURATION: ProviderConfiguration = {
    authorizeHost: "https://www.linkedin.com",
    authorizePath: "/oauth/v2/authorization",
    tokenHost: "https://www.linkedin.com",
    tokenPath: "/oauth/v2/accessToken",
};

type OAuth2Client = {
    generateAuthorizationUri(request: FastifyRequest, reply: FastifyReply): Promise<string>;
    getAccessTokenFromAuthorizationCodeFlow(
        request: FastifyRequest,
        reply: FastifyReply,
    ): Promise<{ token: { access_token: string } }>;
};

function cookieOptions() {
    return refreshCookieOptions();
}

export async function registerConfiguredOAuthProviders(app: FastifyInstance): Promise<void> {
    const env = getApiEnv();

    await registerProvider(app, "google", env.oauth.google, {
        auth: oauth2.GOOGLE_CONFIGURATION,
        scope: ["openid", "email", "profile"],
        pkce: "S256",
    });
    await registerProvider(app, "facebook", env.oauth.facebook, {
        auth: oauth2.FACEBOOK_CONFIGURATION,
        scope: ["email", "public_profile"],
    });
    await registerProvider(app, "linkedin", env.oauth.linkedin, {
        auth: LINKEDIN_OIDC_CONFIGURATION,
        scope: ["openid", "profile", "email"],
        pkce: "S256",
        authorizationMethod: "body",
    });
    await registerProvider(app, "github", env.oauth.github, {
        auth: oauth2.GITHUB_CONFIGURATION,
        scope: ["read:user", "user:email"],
        pkce: "S256",
    });
}

async function registerProvider(
    app: FastifyInstance,
    provider: SocialProvider,
    config: OAuthClientConfig | null,
    options: {
        auth: ProviderConfiguration;
        scope: string[];
        pkce?: "S256";
        authorizationMethod?: "header" | "body";
    },
): Promise<void> {
    if (!config) {
        return;
    }

    await app.register(oauthPlugin, {
        name: OAUTH_DECORATOR[provider],
        credentials: {
            client: {
                id: config.clientId,
                secret: config.clientSecret,
            },
            auth: options.auth,
            options: options.authorizationMethod
                ? { authorizationMethod: options.authorizationMethod }
                : undefined,
        },
        callbackUri: config.callbackUrl,
        scope: options.scope,
        pkce: options.pkce,
        cookie: cookieOptions(),
    });
}

export class FastifySocialOAuthAdapter implements SocialOAuthAdapter {
    constructor(private readonly app: FastifyInstance) {}

    isConfigured(provider: SocialProvider): boolean {
        return getApiEnv().oauth[provider] !== null && this.getClient(provider) !== undefined;
    }

    async createAuthorizationUrl(
        provider: SocialProvider,
        request: unknown,
        reply: unknown,
    ): Promise<string> {
        return this.requireClient(provider).generateAuthorizationUri(
            request as FastifyRequest,
            reply as FastifyReply,
        );
    }

    async exchangeAuthorizationCode(
        provider: SocialProvider,
        request: unknown,
        reply: unknown,
    ): Promise<string> {
        const token = await this.requireClient(provider).getAccessTokenFromAuthorizationCodeFlow(
            request as FastifyRequest,
            reply as FastifyReply,
        );

        return token.token.access_token;
    }

    private requireClient(provider: SocialProvider): OAuth2Client {
        const client = this.getClient(provider);

        if (!client) {
            throw socialProviderNotConfiguredError();
        }

        return client;
    }

    private getClient(provider: SocialProvider): OAuth2Client | undefined {
        const decorator = OAUTH_DECORATOR[provider];
        return (this.app as FastifyInstance & Record<string, OAuth2Client | undefined>)[decorator];
    }
}
