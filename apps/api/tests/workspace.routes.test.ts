import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { createTestRepositories } from "./memory-admin.repository.js";
import { MemoryWorkspaceRepository } from "./memory-workspace.repository.js";

async function register(app: Awaited<ReturnType<typeof buildApp>>, name: string, email: string) {
    const response = await app.inject({
        method: "POST",
        url: "/api/auth/register",
        payload: { name, email, password: "StrongPassword123" },
    });
    return {
        token: response.json().data.accessToken as string,
        userId: response.json().data.user.id as string,
    };
}

describe("workspace and site routes", () => {
    it("creates a default personal workspace on register", async () => {
        const repos = createTestRepositories();
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository: repos.workspaceRepository,
        });
        const { token } = await register(app, "Kristian Petrov", "kristian@example.com");

        const response = await app.inject({
            method: "GET",
            url: "/api/workspaces",
            headers: { authorization: `Bearer ${token}` },
        });

        expect(response.statusCode).toBe(200);
        expect(response.json().data.items).toHaveLength(1);
        expect(response.json().data.items[0].name).toBe("Kristian's Workspace");
        expect(response.json().data.items[0].role).toBe("owner");
        await app.close();
    });

    it("hides foreign workspaces and forbids access", async () => {
        const repos = createTestRepositories();
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository: repos.workspaceRepository,
        });
        const first = await register(app, "Admin", "admin@example.com");
        const second = await register(app, "User", "user@example.com");

        const firstWorkspaces = await app.inject({
            method: "GET",
            url: "/api/workspaces",
            headers: { authorization: `Bearer ${first.token}` },
        });
        const secondWorkspaces = await app.inject({
            method: "GET",
            url: "/api/workspaces",
            headers: { authorization: `Bearer ${second.token}` },
        });

        expect(firstWorkspaces.json().data.items).toHaveLength(1);
        expect(secondWorkspaces.json().data.items).toHaveLength(1);
        expect(firstWorkspaces.json().data.items[0].id).not.toBe(
            secondWorkspaces.json().data.items[0].id,
        );

        const forbidden = await app.inject({
            method: "GET",
            url: `/api/workspaces/${firstWorkspaces.json().data.items[0].id}`,
            headers: { authorization: `Bearer ${second.token}` },
        });
        expect(forbidden.statusCode).toBe(403);
        await app.close();
    });

    it("creates a workspace and a site, then rejects a duplicate normalized URL", async () => {
        const repos = createTestRepositories();
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository: repos.workspaceRepository,
        });
        const { token } = await register(app, "Kristian", "kristian@example.com");
        const workspaces = await app.inject({
            method: "GET",
            url: "/api/workspaces",
            headers: { authorization: `Bearer ${token}` },
        });
        const workspaceId = workspaces.json().data.items[0].id as string;

        const created = await app.inject({
            method: "POST",
            url: `/api/workspaces/${workspaceId}/sites`,
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Example", url: "https://example.com" },
        });
        expect(created.statusCode).toBe(201);
        expect(created.json().data.site.normalizedUrl).toBe("https://example.com/");

        const duplicate = await app.inject({
            method: "POST",
            url: `/api/workspaces/${workspaceId}/sites`,
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Example 2", url: "https://example.com/" },
        });
        expect(duplicate.statusCode).toBe(422);
        expect(duplicate.json().error.fields.url).toBeDefined();
        await app.close();
    });

    it("supports site search, pagination, soft delete and restore", async () => {
        const repos = createTestRepositories();
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository: repos.workspaceRepository,
        });
        const { token } = await register(app, "Kristian", "kristian@example.com");
        const workspaceId = (
            await app.inject({
                method: "GET",
                url: "/api/workspaces",
                headers: { authorization: `Bearer ${token}` },
            })
        ).json().data.items[0].id as string;

        await app.inject({
            method: "POST",
            url: `/api/workspaces/${workspaceId}/sites`,
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Alpha", url: "https://alpha.test" },
        });
        const beta = await app.inject({
            method: "POST",
            url: `/api/workspaces/${workspaceId}/sites`,
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Beta", url: "https://beta.test" },
        });
        const siteId = beta.json().data.site.id as string;

        const search = await app.inject({
            method: "GET",
            url: `/api/workspaces/${workspaceId}/sites?search=beta&page=1&perPage=10`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(search.json().data.items).toHaveLength(1);
        expect(search.json().data.pagination.total).toBe(1);

        const removed = await app.inject({
            method: "DELETE",
            url: `/api/workspaces/${workspaceId}/sites/${siteId}`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(removed.statusCode).toBe(200);
        expect(removed.json().data.site.deletedAt).not.toBeNull();

        const restored = await app.inject({
            method: "POST",
            url: `/api/workspaces/${workspaceId}/sites/${siteId}/restore`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(restored.statusCode).toBe(200);
        expect(restored.json().data.site.deletedAt).toBeNull();
        await app.close();
    });

    it("prevents a viewer from updating or deleting sites", async () => {
        const repos = createTestRepositories();
        const workspaceRepository = repos.workspaceRepository as MemoryWorkspaceRepository;
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository,
        });
        const owner = await register(app, "Admin", "admin@example.com");
        const viewer = await register(app, "Viewer", "viewer@example.com");
        const workspaceId = (
            await app.inject({
                method: "GET",
                url: "/api/workspaces",
                headers: { authorization: `Bearer ${owner.token}` },
            })
        ).json().data.items[0].id as string;

        workspaceRepository.addMember(workspaceId, viewer.userId, "viewer");

        const created = await app.inject({
            method: "POST",
            url: `/api/workspaces/${workspaceId}/sites`,
            headers: { authorization: `Bearer ${owner.token}` },
            payload: { name: "Example", url: "https://example.com" },
        });
        const siteId = created.json().data.site.id as string;

        const listed = await app.inject({
            method: "GET",
            url: `/api/workspaces/${workspaceId}/sites`,
            headers: { authorization: `Bearer ${viewer.token}` },
        });
        expect(listed.statusCode).toBe(200);

        const update = await app.inject({
            method: "PATCH",
            url: `/api/workspaces/${workspaceId}/sites/${siteId}`,
            headers: { authorization: `Bearer ${viewer.token}` },
            payload: { name: "Hacked" },
        });
        expect(update.statusCode).toBe(403);

        const remove = await app.inject({
            method: "DELETE",
            url: `/api/workspaces/${workspaceId}/sites/${siteId}`,
            headers: { authorization: `Bearer ${viewer.token}` },
        });
        expect(remove.statusCode).toBe(403);
        await app.close();
    });

    it("blocks members from accessing sites in a foreign workspace", async () => {
        const repos = createTestRepositories();
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository: repos.workspaceRepository,
        });
        const first = await register(app, "One", "one@example.com");
        const second = await register(app, "Two", "two@example.com");
        const firstWorkspaceId = (
            await app.inject({
                method: "GET",
                url: "/api/workspaces",
                headers: { authorization: `Bearer ${first.token}` },
            })
        ).json().data.items[0].id as string;

        const created = await app.inject({
            method: "POST",
            url: `/api/workspaces/${firstWorkspaceId}/sites`,
            headers: { authorization: `Bearer ${first.token}` },
            payload: { name: "Private", url: "https://private.test" },
        });
        const siteId = created.json().data.site.id as string;

        const forbidden = await app.inject({
            method: "GET",
            url: `/api/workspaces/${firstWorkspaceId}/sites/${siteId}`,
            headers: { authorization: `Bearer ${second.token}` },
        });
        expect(forbidden.statusCode).toBe(403);
        await app.close();
    });

    it("creates an additional workspace for the current user", async () => {
        const repos = createTestRepositories();
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository: repos.workspaceRepository,
        });
        const { token } = await register(app, "Kristian", "kristian@example.com");

        const created = await app.inject({
            method: "POST",
            url: "/api/workspaces",
            headers: { authorization: `Bearer ${token}` },
            payload: { name: "Agency workspace" },
        });
        expect(created.statusCode).toBe(201);
        expect(created.json().data.workspace.name).toBe("Agency workspace");
        expect(created.json().data.workspace.role).toBe("owner");

        const listed = await app.inject({
            method: "GET",
            url: "/api/workspaces",
            headers: { authorization: `Bearer ${token}` },
        });
        expect(listed.json().data.items).toHaveLength(2);
        await app.close();
    });

    it("backfills a personal workspace only when the user has none", async () => {
        const repos = createTestRepositories();
        const app = await buildApp({
            repository: repos.repository,
            workspaceRepository: repos.workspaceRepository,
        });
        await register(app, "Kristian", "kristian@example.com");

        expect(await repos.workspaceRepository.backfillPersonalWorkspaces()).toBe(0);

        repos.repository.workspaceStore.members.clear();
        repos.repository.workspaceStore.workspaces.clear();
        expect(await repos.workspaceRepository.backfillPersonalWorkspaces()).toBe(1);
        expect(await repos.workspaceRepository.backfillPersonalWorkspaces()).toBe(0);
        await app.close();
    });
});
