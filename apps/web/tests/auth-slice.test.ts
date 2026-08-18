import { describe, expect, it } from "vitest";

import {
    authReducer,
    authSucceeded,
    clearAuth,
    setCredentials,
    setInitialized,
} from "@/features/auth/authSlice";

describe("auth reducer", () => {
    it("stores successful login state", () => {
        const state = authReducer(
            undefined,
            authSucceeded({
                user: {
                    id: "u1",
                    name: "Kristian",
                    email: "user@example.com",
                    emailVerified: false,
                    theme: "system",
                    roles: ["admin"],
                    permissions: ["admin.access"],
                },
                accessToken: "token-1",
            }),
        );

        expect(state.user?.email).toBe("user@example.com");
        expect(state.accessToken).toBe("token-1");
    });

    it("clears auth state on logout", () => {
        const initial = authReducer(
            undefined,
            authSucceeded({
                user: {
                    id: "u1",
                    name: "Kristian",
                    email: "user@example.com",
                    emailVerified: false,
                    theme: "system",
                    roles: ["user"],
                    permissions: ["sites.view"],
                },
                accessToken: "token-1",
            }),
        );
        const state = authReducer(initial, clearAuth());

        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
    });

    it("allows token update after refresh", () => {
        const initial = authReducer(undefined, setInitialized(true));
        const state = authReducer(initial, setCredentials({ accessToken: "token-2" }));
        expect(state.accessToken).toBe("token-2");
    });

    it("failed refresh clears auth", () => {
        const initial = authReducer(
            undefined,
            authSucceeded({
                user: {
                    id: "u1",
                    name: "Kristian",
                    email: "user@example.com",
                    emailVerified: false,
                    theme: "system",
                    roles: ["user"],
                    permissions: ["sites.view"],
                },
                accessToken: "stale-token",
            }),
        );
        const state = authReducer(initial, clearAuth());
        expect(state.user).toBeNull();
        expect(state.accessToken).toBeNull();
    });
});
