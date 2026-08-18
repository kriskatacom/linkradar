import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";
import { authReducer, authSucceeded, setInitialized } from "@/features/auth/authSlice";
import { workspaceReducer } from "@/features/workspaces/workspaceSlice";
import { api } from "@/services/api";

vi.mock("@/features/auth/api/authApi", () => ({
    useLogoutMutation: () => [() => ({ unwrap: async () => undefined }), { isLoading: false }],
}));

vi.mock("@/features/workspaces/api/workspaceApi", () => ({
    useGetWorkspacesQuery: () => ({
        data: {
            data: {
                items: [
                    {
                        id: "ws-1",
                        name: "Kristian's Workspace",
                        slug: "kristians-workspace",
                        ownerUserId: "u1",
                        role: "owner",
                        membersCount: 1,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                ],
            },
        },
        isLoading: false,
    }),
}));

function createStore(permissions: string[]) {
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
                theme: "system",
                roles: ["user"],
                permissions,
            },
            accessToken: "token",
        }),
    );

    return store;
}

describe("AppShell permissions", () => {
    it("shows Administration nav item when user has admin.access", () => {
        const store = createStore(["admin.access"]);

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/app/dashboard"]}>
                    <Routes>
                        <Route path="/app" element={<AppShell />}>
                            <Route path="dashboard" element={<div>Dashboard</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.getByText("Administration")).toBeInTheDocument();
        expect(screen.getByText("Kristian's Workspace")).toBeInTheDocument();
    });

    it("hides Administration nav item when user lacks admin.access", () => {
        const store = createStore(["sites.view"]);

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/app/dashboard"]}>
                    <Routes>
                        <Route path="/app" element={<AppShell />}>
                            <Route path="dashboard" element={<div>Dashboard</div>} />
                        </Route>
                    </Routes>
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.queryByText("Administration")).not.toBeInTheDocument();
    });
});
