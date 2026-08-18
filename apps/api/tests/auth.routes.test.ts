import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { getApiEnv } from "../src/config/env.js";
import { MemoryAuthRepository } from "./memory-auth.repository.js";

function cookieHeader(setCookie: string | string[] | undefined): string {
    const values = !setCookie ? [] : Array.isArray(setCookie) ? setCookie : [setCookie];
    return values.map((entry) => entry.split(";")[0]).join("; ");
}

describe("auth routes", () => {
    it("registers and returns an access token plus HttpOnly refresh cookie", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });

        const response = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
        });

        expect(response.statusCode).toBe(201);
        const body = response.json();
        expect(body.success).toBe(true);
        expect(body.data.user.email).toBe("user@example.com");
        expect(body.data.accessToken).toEqual(expect.any(String));
        expect(body.data.user).not.toHaveProperty("passwordHash");
        expect(JSON.stringify(body)).not.toContain("password_hash");

        const setCookie = response.headers["set-cookie"];
        const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        expect(cookie).toContain(`${getApiEnv().authCookieName}=`);
        expect(cookie).toContain("HttpOnly");

        await app.close();
    });

    it("returns 422 with field arrays for invalid register input", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });

        const response = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "K",
                email: "not-an-email",
                password: "short",
            },
        });

        expect(response.statusCode).toBe(422);
        const body = response.json();
        expect(body.error.code).toBe("VALIDATION_ERROR");
        expect(Array.isArray(body.error.fields.email)).toBe(true);
        expect(Array.isArray(body.error.fields.password)).toBe(true);

        await app.close();
    });

    it("returns the current user for a valid access token", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });
        const registered = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
        });
        const accessToken = registered.json().data.accessToken as string;

        const response = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().data.user.email).toBe("user@example.com");
        expect(response.json().data.user.roles).toEqual(["admin"]);

        await app.close();
    });

    it("rejects /me without a token", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });

        const response = await app.inject({
            method: "GET",
            url: "/api/auth/me",
        });

        expect(response.statusCode).toBe(401);
        expect(response.json().error.code).toBe("UNAUTHENTICATED");

        await app.close();
    });

    it("clears the refresh cookie on logout", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });
        const registered = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "Kristian",
                email: "user@example.com",
                password: "StrongPassword123",
            },
        });

        const response = await app.inject({
            method: "POST",
            url: "/api/auth/logout",
            headers: {
                cookie: cookieHeader(registered.headers["set-cookie"]),
            },
        });

        expect(response.statusCode).toBe(200);
        const setCookie = response.headers["set-cookie"];
        const cookie = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
        expect(cookie).toMatch(/Max-Age=0|Expires=/i);

        await app.close();
    });

    it("clears the refresh cookie for an invalid refresh token", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });

        const response = await app.inject({
            method: "POST",
            url: "/api/auth/refresh",
            headers: {
                cookie: `${getApiEnv().authCookieName}=not-a-real-token`,
            },
        });

        expect(response.statusCode).toBe(401);
        const setCookie = response.headers["set-cookie"];
        const cookie = Array.isArray(setCookie) ? setCookie.join(";") : setCookie;
        expect(cookie).toMatch(/Max-Age=0|Expires=/i);

        await app.close();
    });

    it("returns success when logging out without a cookie", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });

        const response = await app.inject({
            method: "POST",
            url: "/api/auth/logout",
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().success).toBe(true);

        await app.close();
    });

    it("denies admin test endpoint for normal users and allows admin", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });

        const adminRegister = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "Admin",
                email: "admin@example.com",
                password: "StrongPassword123",
            },
        });
        const adminAccessToken = adminRegister.json().data.accessToken as string;

        const userRegister = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "User",
                email: "user@example.com",
                password: "StrongPassword123",
            },
        });
        const userAccessToken = userRegister.json().data.accessToken as string;

        const forbidden = await app.inject({
            method: "GET",
            url: "/api/admin/test",
            headers: {
                authorization: `Bearer ${userAccessToken}`,
            },
        });
        expect(forbidden.statusCode).toBe(403);
        expect(forbidden.json().error.code).toBe("FORBIDDEN");

        const allowed = await app.inject({
            method: "GET",
            url: "/api/admin/test",
            headers: {
                authorization: `Bearer ${adminAccessToken}`,
            },
        });
        expect(allowed.statusCode).toBe(200);
        expect(allowed.json().data.message).toBe("Admin access granted.");

        await app.close();
    });
});
