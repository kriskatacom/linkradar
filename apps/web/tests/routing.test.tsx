import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { GuestRoute } from "@/components/routing/guest-route";
import { ProtectedRoute } from "@/components/routing/protected-route";
import { authReducer, authSucceeded, setInitialized } from "@/features/auth/authSlice";

function createStore(authenticated: boolean) {
    const store = configureStore({
        reducer: {
            auth: authReducer,
        },
    });

    store.dispatch(setInitialized(true));

    if (authenticated) {
        store.dispatch(
            authSucceeded({
                user: {
                    id: "u1",
                    name: "Kristian",
                    email: "user@example.com",
                    emailVerified: false,
                },
                accessToken: "token",
            }),
        );
    }

    return store;
}

describe("routing guards", () => {
    it("protected route redirects unauthenticated users", () => {
        const store = createStore(false);
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/app/dashboard"]}>
                    <Routes>
                        <Route element={<ProtectedRoute />}>
                            <Route path="/app/dashboard" element={<div>Dashboard</div>} />
                        </Route>
                        <Route path="/login" element={<div>Login page</div>} />
                    </Routes>
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.getByText("Login page")).toBeInTheDocument();
    });

    it("protected route renders authenticated users", () => {
        const store = createStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/app/dashboard"]}>
                    <Routes>
                        <Route element={<ProtectedRoute />}>
                            <Route path="/app/dashboard" element={<div>Dashboard</div>} />
                        </Route>
                        <Route path="/login" element={<div>Login page</div>} />
                    </Routes>
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("guest route redirects authenticated users", () => {
        const store = createStore(true);
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/login"]}>
                    <Routes>
                        <Route element={<GuestRoute />}>
                            <Route path="/login" element={<div>Login page</div>} />
                        </Route>
                        <Route path="/app/dashboard" element={<div>Dashboard</div>} />
                    </Routes>
                </MemoryRouter>
            </Provider>,
        );

        expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });
});
