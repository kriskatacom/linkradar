import type { FastifyReply, FastifyRequest } from "fastify";

import { getApiEnv } from "../config/env.js";

type RefreshCookieOptions = {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "none" | "strict";
    path?: string;
    domain?: string;
    partitioned?: boolean;
    maxAge?: number;
};

export function readRefreshToken(request: FastifyRequest): string | undefined {
    const token = request.cookies[getApiEnv().authCookieName];
    return token && token.length > 0 ? token : undefined;
}

export function refreshCookieOptions(overrides: RefreshCookieOptions = {}): RefreshCookieOptions {
    const env = getApiEnv();

    return {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: env.cookieSameSite,
        path: env.authCookiePath,
        ...(env.cookieDomain ? { domain: env.cookieDomain } : {}),
        ...(env.cookiePartitioned ? { partitioned: true } : {}),
        ...overrides,
    };
}

export function setRefreshCookie(reply: FastifyReply, refreshToken: string): void {
    const env = getApiEnv();

    reply.setCookie(env.authCookieName, refreshToken, {
        ...refreshCookieOptions(),
        maxAge: env.refreshTokenDays * 24 * 60 * 60,
    });
}

export function clearRefreshCookie(reply: FastifyReply): void {
    const env = getApiEnv();

    reply.clearCookie(env.authCookieName, refreshCookieOptions());
}

export function requestContext(request: FastifyRequest) {
    const userAgentHeader = request.headers["user-agent"];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : userAgentHeader;

    return {
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
        ipAddress: request.ip ? request.ip.slice(0, 45) : null,
    };
}
