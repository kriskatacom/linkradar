import { afterEach, describe, expect, it } from "vitest";

import {
    getAllowedFrontendOrigins,
    getApiEnv,
    isAllowedFrontendOrigin,
    resetApiEnvCache,
} from "../src/config/env.js";

const originalEnv = {
    FRONTEND_URL: process.env.FRONTEND_URL,
    AUTH_COOKIE_SAMESITE: process.env.AUTH_COOKIE_SAMESITE,
    AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
    AUTH_COOKIE_PARTITIONED: process.env.AUTH_COOKIE_PARTITIONED,
    LAN_ENABLED: process.env.LAN_ENABLED,
    LAN_HOST: process.env.LAN_HOST,
    LAN_FRONTEND_URL: process.env.LAN_FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
};

afterEach(() => {
    process.env.FRONTEND_URL = originalEnv.FRONTEND_URL;
    process.env.AUTH_COOKIE_SAMESITE = originalEnv.AUTH_COOKIE_SAMESITE;
    process.env.AUTH_COOKIE_SECURE = originalEnv.AUTH_COOKIE_SECURE;
    process.env.AUTH_COOKIE_PARTITIONED = originalEnv.AUTH_COOKIE_PARTITIONED;
    process.env.LAN_ENABLED = originalEnv.LAN_ENABLED;
    process.env.LAN_HOST = originalEnv.LAN_HOST;
    process.env.LAN_FRONTEND_URL = originalEnv.LAN_FRONTEND_URL;
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    resetApiEnvCache();
});

describe("auth cookie defaults", () => {
    it("uses SameSite=none and Secure for an HTTPS frontend", () => {
        process.env.FRONTEND_URL = "https://website.local";
        process.env.NODE_ENV = "development";
        delete process.env.AUTH_COOKIE_SAMESITE;
        delete process.env.AUTH_COOKIE_SECURE;
        delete process.env.AUTH_COOKIE_PARTITIONED;
        resetApiEnvCache();

        const env = getApiEnv();
        expect(env.cookieSameSite).toBe("none");
        expect(env.cookieSecure).toBe(true);
        expect(env.cookiePartitioned).toBe(true);
    });

    it("keeps SameSite=lax for localhost HTTP", () => {
        process.env.FRONTEND_URL = "http://localhost:5173";
        process.env.NODE_ENV = "development";
        delete process.env.AUTH_COOKIE_SAMESITE;
        delete process.env.AUTH_COOKIE_SECURE;
        delete process.env.AUTH_COOKIE_PARTITIONED;
        resetApiEnvCache();

        const env = getApiEnv();
        expect(env.cookieSameSite).toBe("lax");
        expect(env.cookieSecure).toBe(false);
        expect(env.cookiePartitioned).toBe(false);
    });

    it("matches frontend origins with and without a trailing slash", () => {
        expect(isAllowedFrontendOrigin("https://website.local", "https://website.local/")).toBe(
            true,
        );
        expect(isAllowedFrontendOrigin("https://api.local", "https://website.local")).toBe(false);
    });

    it("allows a configured LAN frontend origin and rejects others", () => {
        expect(
            getAllowedFrontendOrigins({
                frontendUrl: "https://website.local",
                lanHost: "192.168.1.105",
                lanFrontendUrl: "https://192.168.1.105",
            }),
        ).toEqual(expect.arrayContaining(["https://website.local", "https://192.168.1.105"]));

        process.env.FRONTEND_URL = "https://website.local";
        process.env.NODE_ENV = "development";
        process.env.LAN_ENABLED = "true";
        process.env.LAN_HOST = "192.168.1.105";
        process.env.LAN_FRONTEND_URL = "https://192.168.1.105";
        delete process.env.AUTH_COOKIE_SAMESITE;
        delete process.env.AUTH_COOKIE_SECURE;
        delete process.env.AUTH_COOKIE_PARTITIONED;
        resetApiEnvCache();

        const env = getApiEnv();
        expect(isAllowedFrontendOrigin("https://website.local", env.allowedFrontendOrigins)).toBe(
            true,
        );
        expect(isAllowedFrontendOrigin("https://192.168.1.105", env.allowedFrontendOrigins)).toBe(
            true,
        );
        expect(isAllowedFrontendOrigin("https://evil.example", env.allowedFrontendOrigins)).toBe(
            false,
        );
    });
});
