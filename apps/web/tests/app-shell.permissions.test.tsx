import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";
import { authReducer, authSucceeded, setInitialized } from "@/features/auth/authSlice";

vi.mock("@/features/auth/api/authApi", () => ({
    useLogoutMutation: () => [() => ({ unwrap: async () => undefined }), { isLoading: false }],
}));

function createStore(permissions: string[]) {
    const store = configureStore({
        reducer: {
            auth: authReducer,
        },
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
