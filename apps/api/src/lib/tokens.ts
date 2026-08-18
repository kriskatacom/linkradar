import { createHash, randomBytes, randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { getApiEnv } from "../config/env.js";
import type { AccessTokenPayload } from "../modules/auth/auth.types.js";

function getJwtSecretKey(): Uint8Array {
    return new TextEncoder().encode(getApiEnv().jwtAccessSecret);
}

export function generateRefreshToken(): string {
    return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
    const env = getApiEnv();

    return new SignJWT({ sessionId: payload.sessionId })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(payload.sub)
        .setJti(randomUUID())
        .setIssuedAt()
        .setExpirationTime(`${env.jwtAccessTtlSeconds}s`)
        .sign(getJwtSecretKey());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
        algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        throw new Error("Invalid access token subject.");
    }

    if (typeof payload.sessionId !== "string" || payload.sessionId.length === 0) {
        throw new Error("Invalid access token session.");
    }

    return {
        sub: payload.sub,
        sessionId: payload.sessionId,
    };
}
