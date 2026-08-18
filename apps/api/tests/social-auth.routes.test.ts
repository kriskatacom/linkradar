import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { AuthError } from "../src/modules/auth/auth.errors.js";
import { parseOAuthCallbackQuery } from "../src/modules/auth/social/social-auth.routes.js";
import type {
    SocialOAuthAdapter,
    SocialProfileFetcher,
} from "../src/modules/auth/social/social-auth.types.js";
import { MemoryAuthRepository } from "./memory-auth.repository.js";

const mockProfileFetcher: SocialProfileFetcher = {
    async fetchProfile() {
        return {
            provider: "google",
            providerUserId: "google-user-1",
            email: "social@example.com",
            name: "Social User",
            emailVerified: true,
        };
    },
};

function mockOAuthAdapter(overrides: Partial<SocialOAuthAdapter> = {}): SocialOAuthAdapter {
    return {
        isConfigured: () => true,
        createAuthorizationUrl: async () => "https://accounts.google.com/o/oauth2/v2/auth?mock=1",
        exchangeAuthorizationCode: async () => "provider-access-token",
        ...overrides,
    };
}

describe("social auth routes", () => {
    it("rejects an invalid provider", async () => {
        const app = await buildApp({
            repository: new MemoryAuthRepository(),
            oauthAdapter: mockOAuthAdapter(),
            socialProfileFetcher: mockProfileFetcher,
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/auth/social/twitter",
        });

        expect(response.statusCode).toBe(400);
        expect(response.json().error.code).toBe("INVALID_SOCIAL_PROVIDER");

        await app.close();
    });

    it("redirects to the provider authorization url", async () => {
        const app = await buildApp({
            repository: new MemoryAuthRepository(),
            oauthAdapter: mockOAuthAdapter(),
            socialProfileFetcher: mockProfileFetcher,
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/auth/social/google",
        });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe(
            "https://accounts.google.com/o/oauth2/v2/auth?mock=1",
        );

        await app.close();
    });

    it("sets a refresh cookie and redirects to the frontend on success", async () => {
        const app = await buildApp({
            repository: new MemoryAuthRepository(),
            oauthAdapter: mockOAuthAdapter(),
            socialProfileFetcher: mockProfileFetcher,
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/auth/social/google/callback?code=abc&state=valid-state",
        });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("http://localhost:5173/auth/callback");
        const setCookie = response.headers["set-cookie"];
        const cookie = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
        expect(cookie).toContain("HttpOnly");
        expect(cookie).not.toContain("provider-access-token");
        expect(String(response.headers.location)).not.toContain("accessToken");

        await app.close();
    });

    it("rejects a missing OAuth state", async () => {
        expect(() => parseOAuthCallbackQuery({ code: "abc" })).toThrow(/Invalid OAuth state/);

        const app = await buildApp({
            repository: new MemoryAuthRepository(),
            oauthAdapter: mockOAuthAdapter(),
            socialProfileFetcher: mockProfileFetcher,
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/auth/social/google/callback?code=abc",
        });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("http://localhost:5173/login?error=oauth_failed");

        await app.close();
    });

    it("redirects when the OAuth adapter rejects the state", async () => {
        const app = await buildApp({
            repository: new MemoryAuthRepository(),
            oauthAdapter: mockOAuthAdapter({
                exchangeAuthorizationCode: async () => {
                    throw new AuthError("INVALID_OAUTH_STATE", "Invalid OAuth state.", 401);
                },
            }),
            socialProfileFetcher: mockProfileFetcher,
        });

        const response = await app.inject({
            method: "GET",
            url: "/api/auth/social/google/callback?code=abc&state=bad-state",
        });

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toBe("http://localhost:5173/login?error=oauth_failed");

        await app.close();
    });
});
