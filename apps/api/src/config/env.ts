import { config } from "dotenv";
import { resolve } from "node:path";

import type { SocialProvider } from "../modules/auth/social/social-auth.types.js";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../../.env") });

export type CookieSameSite = "lax" | "none" | "strict";

export type OAuthClientConfig = {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
};

export type ApiEnv = {
    nodeEnv: string;
    isProduction: boolean;
    isDevelopment: boolean;
    host: string;
    port: number;
    frontendUrl: string;
    jwtAccessSecret: string;
    jwtAccessTtlSeconds: number;
    refreshTokenDays: number;
    cookieSecure: boolean;
    cookieSameSite: CookieSameSite;
    authCookieName: string;
    authCookiePath: string;
    rateLimitMax: number;
    oauth: Record<SocialProvider, OAuthClientConfig | null>;
};

function requireEnv(name: string): string {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function optionalEnv(name: string, fallback: string): string {
    const value = process.env[name];

    if (value === undefined || value.trim() === "") {
        return fallback;
    }

    return value;
}

function parsePositiveInteger(name: string, raw: string): number {
    const value = Number(raw);

    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Invalid environment variable: ${name}`);
    }

    return value;
}

function parseDurationSeconds(name: string, raw: string): number {
    const match = /^(\d+)(ms|s|m|h|d)?$/i.exec(raw.trim());

    if (!match) {
        throw new Error(`Invalid environment variable: ${name}`);
    }

    const amount = Number(match[1]);
    const unit = (match[2] ?? "s").toLowerCase();
    const multipliers: Record<string, number> = {
        ms: 1 / 1000,
        s: 1,
        m: 60,
        h: 60 * 60,
        d: 60 * 60 * 24,
    };

    const seconds = amount * multipliers[unit];

    if (!Number.isFinite(seconds) || seconds < 1) {
        throw new Error(`Invalid environment variable: ${name}`);
    }

    return Math.floor(seconds);
}

function parseSameSite(raw: string): CookieSameSite {
    if (raw === "lax" || raw === "none" || raw === "strict") {
        return raw;
    }

    throw new Error("Invalid environment variable: AUTH_COOKIE_SAMESITE");
}

function optionalOAuthConfig(prefix: string): OAuthClientConfig | null {
    const clientId = process.env[`${prefix}_CLIENT_ID`]?.trim() ?? "";
    const clientSecret = process.env[`${prefix}_CLIENT_SECRET`]?.trim() ?? "";
    const callbackUrl = process.env[`${prefix}_CALLBACK_URL`]?.trim() ?? "";

    if (!clientId || !clientSecret) {
        return null;
    }

    if (!callbackUrl) {
        throw new Error(
            `Incomplete OAuth configuration for ${prefix}. Set ${prefix}_CALLBACK_URL.`,
        );
    }

    return { clientId, clientSecret, callbackUrl };
}

let cached: ApiEnv | undefined;

export function getApiEnv(): ApiEnv {
    if (cached) {
        return cached;
    }

    const nodeEnv = optionalEnv("NODE_ENV", "development");
    const isProduction = nodeEnv === "production";
    const jwtAccessSecret = requireEnv("JWT_ACCESS_SECRET");

    if (jwtAccessSecret.length < 32) {
        throw new Error("JWT_ACCESS_SECRET must be at least 32 characters.");
    }

    const cookieSameSite = process.env.AUTH_COOKIE_SAMESITE
        ? parseSameSite(process.env.AUTH_COOKIE_SAMESITE)
        : isProduction
          ? "none"
          : "lax";

    const cookieSecure =
        optionalEnv("AUTH_COOKIE_SECURE", isProduction ? "true" : "false") === "true";

    if (cookieSameSite === "none" && !cookieSecure && isProduction) {
        throw new Error(
            "AUTH_COOKIE_SAMESITE=none requires AUTH_COOKIE_SECURE=true in production.",
        );
    }

    cached = {
        nodeEnv,
        isProduction,
        isDevelopment: nodeEnv === "development",
        host: optionalEnv("API_HOST", "127.0.0.1"),
        port: parsePositiveInteger("API_PORT", optionalEnv("API_PORT", "3000")),
        frontendUrl: requireEnv("FRONTEND_URL"),
        jwtAccessSecret,
        jwtAccessTtlSeconds: parseDurationSeconds(
            "JWT_ACCESS_TTL",
            optionalEnv("JWT_ACCESS_TTL", "15m"),
        ),
        refreshTokenDays: parsePositiveInteger(
            "AUTH_REFRESH_TOKEN_DAYS",
            optionalEnv("AUTH_REFRESH_TOKEN_DAYS", "30"),
        ),
        cookieSecure,
        cookieSameSite,
        authCookieName: optionalEnv("AUTH_COOKIE_NAME", "refresh_token"),
        authCookiePath: optionalEnv("AUTH_COOKIE_PATH", "/api/auth"),
        rateLimitMax: parsePositiveInteger(
            "AUTH_RATE_LIMIT_MAX",
            optionalEnv("AUTH_RATE_LIMIT_MAX", isProduction ? "20" : "200"),
        ),
        oauth: {
            google: optionalOAuthConfig("GOOGLE"),
            facebook: optionalOAuthConfig("FACEBOOK"),
            linkedin: optionalOAuthConfig("LINKEDIN"),
            github: optionalOAuthConfig("GITHUB"),
        },
    };

    return cached;
}

export function resetApiEnvCache(): void {
    cached = undefined;
}
