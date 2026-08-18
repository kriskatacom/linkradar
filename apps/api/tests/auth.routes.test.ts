import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { getApiEnv } from "../src/config/env.js";
import { SYSTEM_PERMISSIONS } from "../src/modules/auth/rbac/system-permissions.js";
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
        expect(body.data.user.theme).toBe("system");
        expect(body.data.accessToken).toEqual(expect.any(String));
        expect(body.data.user.roles).toEqual(["admin"]);
        expect(body.data.user.permissions).toContain(SYSTEM_PERMISSIONS.ADMIN_ACCESS);
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
        expect(response.json().data.user.permissions).toContain(SYSTEM_PERMISSIONS.ADMIN_ACCESS);

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

        const anonymous = await app.inject({
            method: "GET",
            url: "/api/admin/test",
        });
        expect(anonymous.statusCode).toBe(401);

        const sitesAllowed = await app.inject({
            method: "GET",
            url: "/api/permissions/test/sites-view",
            headers: {
                authorization: `Bearer ${userAccessToken}`,
            },
        });
        expect(sitesAllowed.statusCode).toBe(200);

        const usersManageForbidden = await app.inject({
            method: "GET",
            url: "/api/permissions/test/users-manage-any",
            headers: {
                authorization: `Bearer ${userAccessToken}`,
            },
        });
        expect(usersManageForbidden.statusCode).toBe(403);

        const allPermissionsAllowed = await app.inject({
            method: "GET",
            url: "/api/permissions/test/sites-read-write",
            headers: {
                authorization: `Bearer ${userAccessToken}`,
            },
        });
        expect(allPermissionsAllowed.statusCode).toBe(200);

        await app.close();
    });

    it("keeps the session authenticated across refresh", async () => {
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

        const refreshed = await app.inject({
            method: "POST",
            url: "/api/auth/refresh",
            headers: {
                cookie: cookieHeader(registered.headers["set-cookie"]),
            },
        });

        expect(refreshed.statusCode).toBe(200);
        expect(refreshed.json().data.user.email).toBe("user@example.com");
        expect(refreshed.json().data.accessToken).toEqual(expect.any(String));

        const me = await app.inject({
            method: "GET",
            url: "/api/auth/me",
            headers: {
                authorization: `Bearer ${refreshed.json().data.accessToken}`,
            },
        });

        expect(me.statusCode).toBe(200);
        expect(me.json().data.user.email).toBe("user@example.com");

        await app.close();
    });

    it("logs out and then rejects refresh", async () => {
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
        const cookie = cookieHeader(registered.headers["set-cookie"]);

        const logout = await app.inject({
            method: "POST",
            url: "/api/auth/logout",
            headers: { cookie },
        });
        expect(logout.statusCode).toBe(200);

        const refreshed = await app.inject({
            method: "POST",
            url: "/api/auth/refresh",
            headers: { cookie },
        });
        expect(refreshed.statusCode).toBe(401);

        await app.close();
    });

    it("stores theme per user and restores it after refresh", async () => {
        const app = await buildApp({ repository: new MemoryAuthRepository() });

        const userA = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "User A",
                email: "a@example.com",
                password: "StrongPassword123",
            },
        });
        const userB = await app.inject({
            method: "POST",
            url: "/api/auth/register",
            payload: {
                name: "User B",
                email: "b@example.com",
                password: "StrongPassword123",
            },
        });

        const dark = await app.inject({
            method: "PATCH",
            url: "/api/auth/me",
            headers: {
                authorization: `Bearer ${userA.json().data.accessToken}`,
            },
            payload: { theme: "dark" },
        });
        expect(dark.statusCode).toBe(200);
        expect(dark.json().data.user.theme).toBe("dark");

        const light = await app.inject({
            method: "PATCH",
            url: "/api/auth/me",
            headers: {
                authorization: `Bearer ${userB.json().data.accessToken}`,
            },
            payload: { theme: "light" },
        });
        expect(light.statusCode).toBe(200);
        expect(light.json().data.user.theme).toBe("light");

        const refreshA = await app.inject({
            method: "POST",
            url: "/api/auth/refresh",
            headers: {
                cookie: cookieHeader(userA.headers["set-cookie"]),
            },
        });
        expect(refreshA.json().data.user.theme).toBe("dark");

        const refreshB = await app.inject({
            method: "POST",
            url: "/api/auth/refresh",
            headers: {
                cookie: cookieHeader(userB.headers["set-cookie"]),
            },
        });
        expect(refreshB.json().data.user.theme).toBe("light");

        await app.close();
    });
});
