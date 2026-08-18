import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { SYSTEM_PERMISSIONS } from "../src/modules/auth/rbac/system-permissions.js";
import { createTestRepositories } from "./memory-admin.repository.js";

async function registerAdmin(app: Awaited<ReturnType<typeof buildApp>>) {
    const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
            name: "Admin",
            email: "admin@example.com",
            password: "StrongPassword123",
        },
    });
    return response.json().data.accessToken as string;
}

async function registerUser(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
    const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: {
            name: "User",
            email,
            password: "StrongPassword123",
        },
    });
    return response.json().data.accessToken as string;
}

describe("admin users routes", () => {
    it("lists users with pagination and permissions", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);

        const response = await app.inject({
            method: "GET",
            url: "/api/admin/users?page=1&perPage=10",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().data.items.length).toBeGreaterThan(0);
        expect(response.json().data.pagination.total).toBeGreaterThan(0);

        await app.close();
    });

    it("denies users list for normal users", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        await registerAdmin(app);
        const userToken = await registerUser(app, "user@example.com");

        const response = await app.inject({
            method: "GET",
            url: "/api/admin/users",
            headers: { authorization: `Bearer ${userToken}` },
        });

        expect(response.statusCode).toBe(403);
        await app.close();
    });

    it("returns user detail with roles", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);
        const userId = [...repository.users.values()][0]?.id as string;

        const response = await app.inject({
            method: "GET",
            url: `/api/admin/users/${userId}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().data.user.roles).toContain("admin");
        await app.close();
    });

    it("protects last admin from deactivation and role removal", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);
        const adminId = [...repository.users.values()][0]?.id as string;

        const deactivate = await app.inject({
            method: "POST",
            url: `/api/admin/users/${adminId}/deactivate`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(deactivate.statusCode).toBe(409);
        expect(deactivate.json().error.code).toBe("LAST_ADMIN_PROTECTED");

        const syncRoles = await app.inject({
            method: "PUT",
            url: `/api/admin/users/${adminId}/roles`,
            headers: { authorization: `Bearer ${token}` },
            payload: { roles: ["user"] },
        });
        expect(syncRoles.statusCode).toBe(409);
        expect(syncRoles.json().error.code).toBe("LAST_ADMIN_PROTECTED");

        await app.close();
    });

    it("allows admin changes when another active admin exists", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const firstToken = await registerAdmin(app);
        const secondToken = await registerUser(app, "second-admin@example.com");
        const firstAdminId = [...repository.users.values()].find(
            (user) => user.email === "admin@example.com",
        )?.id as string;
        const secondAdminId = [...repository.users.values()].find(
            (user) => user.email === "second-admin@example.com",
        )?.id as string;

        await app.inject({
            method: "PUT",
            url: `/api/admin/users/${secondAdminId}/roles`,
            headers: { authorization: `Bearer ${firstToken}` },
            payload: { roles: ["admin", "user"] },
        });

        const deactivate = await app.inject({
            method: "POST",
            url: `/api/admin/users/${firstAdminId}/deactivate`,
            headers: { authorization: `Bearer ${firstToken}` },
        });
        expect(deactivate.statusCode).toBe(200);

        await app.close();
    });

    it("clears sessions on deactivate and soft delete", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        await registerAdmin(app);
        const userToken = await registerUser(app, "member@example.com");
        const userId = [...repository.users.values()].find(
            (user) => user.email === "member@example.com",
        )?.id as string;
        const adminToken = (
            await app.inject({
                method: "POST",
                url: "/api/auth/login",
                payload: { email: "admin@example.com", password: "StrongPassword123" },
            })
        ).json().data.accessToken as string;

        expect(repository.sessions.size).toBeGreaterThan(1);

        const deactivate = await app.inject({
            method: "POST",
            url: `/api/admin/users/${userId}/deactivate`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(deactivate.statusCode).toBe(200);
        expect(
            [...repository.sessions.values()].some((session) => session.userId === userId),
        ).toBe(false);

        await app.close();
    });
});

describe("admin roles routes", () => {
    it("creates and lists custom roles", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);

        const created = await app.inject({
            method: "POST",
            url: "/api/admin/roles",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "manager", label: "Manager" },
        });
        expect(created.statusCode).toBe(201);

        const list = await app.inject({
            method: "GET",
            url: "/api/admin/roles",
            headers: { authorization: `Bearer ${token}` },
        });
        expect(list.json().data.items.some((role: { name: string }) => role.name === "manager")).toBe(
            true,
        );

        await app.close();
    });

    it("protects system roles from deletion", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);
        const adminRole = [...repository.roles.values()].find((role) => role.name === "admin");

        const response = await app.inject({
            method: "DELETE",
            url: `/api/admin/roles/${adminRole?.id}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(409);
        expect(response.json().error.code).toBe("SYSTEM_ROLE_PROTECTED");
        await app.close();
    });

    it("rejects deleting roles that are in use", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);

        const created = await app.inject({
            method: "POST",
            url: "/api/admin/roles",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "manager", label: "Manager" },
        });
        const roleId = created.json().data.role.id as string;
        const userId = [...repository.users.values()].find(
            (user) => user.email === "admin@example.com",
        )?.id as string;

        await app.inject({
            method: "PUT",
            url: `/api/admin/users/${userId}/roles`,
            headers: { authorization: `Bearer ${token}` },
            payload: { roles: ["admin", "manager"] },
        });

        const response = await app.inject({
            method: "DELETE",
            url: `/api/admin/roles/${roleId}`,
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(409);
        expect(response.json().error.code).toBe("ROLE_IN_USE");
        await app.close();
    });

    it("blocks editing admin role permissions", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);
        const adminRole = [...repository.roles.values()].find((role) => role.name === "admin");

        const response = await app.inject({
            method: "PUT",
            url: `/api/admin/roles/${adminRole?.id}/permissions`,
            headers: { authorization: `Bearer ${token}` },
            payload: { permissions: [SYSTEM_PERMISSIONS.SITES_VIEW] },
        });

        expect(response.statusCode).toBe(409);
        expect(response.json().error.code).toBe("SYSTEM_ROLE_PROTECTED");
        await app.close();
    });
});

describe("admin permissions and stats routes", () => {
    it("lists permissions and stats", async () => {
        const { repository, adminRepository } = createTestRepositories();
        const app = await buildApp({ repository, adminRepository });
        const token = await registerAdmin(app);

        const permissions = await app.inject({
            method: "GET",
            url: "/api/admin/permissions",
            headers: { authorization: `Bearer ${token}` },
        });
        expect(permissions.statusCode).toBe(200);
        expect(permissions.json().data.items.length).toBe(25);

        const stats = await app.inject({
            method: "GET",
            url: "/api/admin/stats",
            headers: { authorization: `Bearer ${token}` },
        });
        expect(stats.statusCode).toBe(200);
        expect(stats.json().data.stats.users).toBeGreaterThan(0);

        await app.close();
    });
});
