import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authReducer, authSucceeded, setInitialized } from "@/features/auth/authSlice";
import { AddSitePage } from "@/features/sites/pages/add-site-page";
import { SitesPage } from "@/features/sites/pages/sites-page";
import { workspaceReducer, setCurrentWorkspaceId } from "@/features/workspaces/workspaceSlice";
import { resolveCurrentWorkspaceId } from "@/features/workspaces/resolve-current-workspace";
import { api } from "@/services/api";

const getWorkspacesQuery = vi.fn();
const getSitesQuery = vi.fn();
const createSiteMutation = vi.fn();

vi.mock("@/features/workspaces/api/workspaceApi", () => ({
    useGetWorkspacesQuery: () => getWorkspacesQuery(),
    useGetSitesQuery: (...args: unknown[]) => getSitesQuery(...args),
    useCreateSiteMutation: () => [createSiteMutation, { isLoading: false }],
}));

function createStore(permissions: string[], workspaceId: string | null = "ws-1") {
    const store = configureStore({
        reducer: {
            auth: authReducer,
            workspace: workspaceReducer,
            [api.reducerPath]: api.reducer,
        },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
    });

    store.dispatch(setInitialized(true));
    store.dispatch(
        authSucceeded({
            user: {
                id: "u1",
                name: "Kristian",
                email: "user@example.com",
                emailVerified: true,
                roles: ["user"],
                permissions,
            },
            accessToken: "token",
        }),
    );
    store.dispatch(setCurrentWorkspaceId(workspaceId));
    return store;
}

const defaultWorkspace = {
    id: "ws-1",
    name: "Kristian's Workspace",
    slug: "kristians-workspace",
    ownerUserId: "u1",
    role: "owner" as const,
    membersCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

describe("workspace selection", () => {
    it("auto-selects the only workspace", () => {
        expect(resolveCurrentWorkspaceId([{ id: "only" }], "stale")).toBe("only");
    });

    it("keeps the last selected workspace when it is still available", () => {
        expect(
            resolveCurrentWorkspaceId([{ id: "a" }, { id: "b" }], "b"),
        ).toBe("b");
    });

    it("falls back to the first workspace when stored id is missing", () => {
        expect(resolveCurrentWorkspaceId([{ id: "a" }, { id: "b" }], null)).toBe("a");
    });

    it("returns null when there are no workspaces", () => {
        expect(resolveCurrentWorkspaceId([], "a")).toBeNull();
    });
});

describe("sites page", () => {
    beforeEach(() => {
        getWorkspacesQuery.mockReturnValue({
            data: { data: { items: [defaultWorkspace] } },
            isLoading: false,
        });
        createSiteMutation.mockReset();
    });

    it("shows empty state when there are no sites", () => {
        getSitesQuery.mockReturnValue({
            data: {
                data: {
                    items: [],
                    pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 },
                },
            },
            isLoading: false,
        });

        render(
            <Provider store={createStore(["sites.view", "sites.create"])}>
                <MemoryRouter>
                    <SitesPage />
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.getByText("No websites yet.")).toBeInTheDocument();
        expect(
            screen.getByText("Add your first website to start scanning."),
        ).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Add website" }).length).toBeGreaterThan(0);
    });

    it("hides the Add website button without sites.create", () => {
        getSitesQuery.mockReturnValue({
            data: {
                data: {
                    items: [],
                    pagination: { page: 1, perPage: 20, total: 0, totalPages: 0 },
                },
            },
            isLoading: false,
        });

        render(
            <Provider store={createStore(["sites.view"])}>
                <MemoryRouter>
                    <SitesPage />
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.queryByRole("button", { name: "Add website" })).not.toBeInTheDocument();
    });

    it("shows API errors", () => {
        getSitesQuery.mockReturnValue({
            data: undefined,
            isLoading: false,
            error: {
                status: 500,
                data: {
                    success: false,
                    error: { code: "INTERNAL_ERROR", message: "Sites failed to load." },
                },
            },
        });

        render(
            <Provider store={createStore(["sites.view"])}>
                <MemoryRouter>
                    <SitesPage />
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.getByText("Sites failed to load.")).toBeInTheDocument();
    });

    it("shows a loading state", () => {
        getSitesQuery.mockReturnValue({
            data: undefined,
            isLoading: true,
        });

        render(
            <Provider store={createStore(["sites.view"])}>
                <MemoryRouter>
                    <SitesPage />
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.getByText("Loading sites...")).toBeInTheDocument();
    });
});

describe("create site form", () => {
    beforeEach(() => {
        createSiteMutation.mockReset();
    });

    it("submits name and url", async () => {
        createSiteMutation.mockReturnValue({
            unwrap: async () => ({
                data: {
                    site: {
                        id: "site-1",
                        workspaceId: "ws-1",
                        name: "Example",
                        url: "https://example.com",
                    },
                },
            }),
        });

        render(
            <Provider store={createStore(["sites.create"])}>
                <MemoryRouter>
                    <AddSitePage />
                </MemoryRouter>
            </Provider>,
        );

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Example" } });
        fireEvent.change(screen.getByLabelText("Website URL"), {
            target: { value: "https://example.com" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add website" }));

        await waitFor(() => {
            expect(createSiteMutation).toHaveBeenCalledWith({
                workspaceId: "ws-1",
                name: "Example",
                url: "https://example.com",
            });
        });
    });

    it("shows backend field errors", async () => {
        createSiteMutation.mockReturnValue({
            unwrap: async () => {
                throw {
                    status: 422,
                    data: {
                        success: false,
                        error: {
                            code: "VALIDATION_ERROR",
                            message: "A site with this URL already exists in the workspace.",
                            fields: { url: ["A site with this URL already exists in the workspace."] },
                        },
                    },
                };
            },
        });

        render(
            <Provider store={createStore(["sites.create"])}>
                <MemoryRouter>
                    <AddSitePage />
                </MemoryRouter>
            </Provider>,
        );

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Example" } });
        fireEvent.change(screen.getByLabelText("Website URL"), {
            target: { value: "https://example.com" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add website" }));

        expect(
            await screen.findAllByText("A site with this URL already exists in the workspace."),
        ).not.toHaveLength(0);
    });
});
