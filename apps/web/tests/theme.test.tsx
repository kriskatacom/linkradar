import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { authReducer, authSucceeded, clearAuth } from "@/features/auth/authSlice";
import type { AuthUser } from "@/features/auth/types";
import { ThemeSync } from "@/features/settings/theme-sync";
import { setThemePreference, themeReducer } from "@/features/settings/themeSlice";
import {
    applyThemePreference,
    clearThemeCache,
    parseThemePreference,
    readThemeCache,
    resolveTheme,
} from "@/features/settings/theme";
import { SettingsPage } from "@/features/settings/pages/settings-page";

const updateTheme = vi.fn();
const requestVerification = vi.fn();

vi.mock("@/features/auth/api/authApi", () => ({
    useUpdateThemeMutation: () => [updateTheme, { isLoading: false }],
    useRequestEmailVerificationMutation: () => [requestVerification, { isLoading: false }],
}));

type MatchMediaMock = {
    matches: boolean;
    media: string;
    addEventListener: ReturnType<typeof vi.fn>;
    removeEventListener: ReturnType<typeof vi.fn>;
    emit: (matches: boolean) => void;
};

function createMatchMedia(matches: boolean): MatchMediaMock {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();

    const media: MatchMediaMock = {
        matches,
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(
            (_event: string, listener: (event: MediaQueryListEvent) => void) => {
                listeners.add(listener);
            },
        ),
        removeEventListener: vi.fn(
            (_event: string, listener: (event: MediaQueryListEvent) => void) => {
                listeners.delete(listener);
            },
        ),
        emit(nextMatches: boolean) {
            media.matches = nextMatches;
            for (const listener of listeners) {
                listener({ matches: nextMatches } as MediaQueryListEvent);
            }
        },
    };

    return media;
}

function mockMatchMedia(matches: boolean): MatchMediaMock {
    const media = createMatchMedia(matches);
    window.matchMedia = vi.fn(() => media as unknown as MediaQueryList);
    return media;
}

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
    return {
        id: "user-a",
        name: "User A",
        email: "a@example.com",
        emailVerified: true,
        theme: "system",
        roles: ["user"],
        permissions: ["sites.view"],
        ...overrides,
    };
}

function createStore() {
    return configureStore({
        reducer: {
            auth: authReducer,
            theme: themeReducer,
        },
    });
}

describe("theme preference", () => {
    beforeEach(() => {
        clearThemeCache();
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "";
        mockMatchMedia(false);
        updateTheme.mockReset();
    });

    afterEach(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "";
        clearThemeCache();
    });

    it("defaults to system when nothing is stored", () => {
        expect(readThemeCache()).toBeNull();
        expect(parseThemePreference("nope")).toBe("system");
    });

    it("applies a stored light preference", () => {
        expect(resolveTheme("light")).toBe("light");
        applyThemePreference("light");
        expect(document.documentElement.classList.contains("dark")).toBe(false);
        expect(document.documentElement.style.colorScheme).toBe("light");
    });

    it("applies a stored dark preference", () => {
        applyThemePreference("dark");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(document.documentElement.style.colorScheme).toBe("dark");
    });

    it("resolves system to dark when the OS prefers dark", () => {
        mockMatchMedia(true);
        expect(resolveTheme("system")).toBe("dark");
        applyThemePreference("system");
        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("keeps theme preferences isolated per user", () => {
        const store = createStore();
        const userA = createUser({ id: "user-a", theme: "dark" });
        const userB = createUser({
            id: "user-b",
            name: "User B",
            email: "b@example.com",
            theme: "light",
        });

        store.dispatch(authSucceeded({ user: userA, accessToken: "a" }));
        expect(store.getState().theme.preference).toBe("dark");
        expect(readThemeCache()).toEqual({ userId: "user-a", theme: "dark" });

        store.dispatch(authSucceeded({ user: userB, accessToken: "b" }));
        expect(store.getState().theme.preference).toBe("light");
        expect(readThemeCache()).toEqual({ userId: "user-b", theme: "light" });

        store.dispatch(clearAuth());
        expect(store.getState().theme.preference).toBe("system");
        expect(readThemeCache()).toBeNull();

        store.dispatch(authSucceeded({ user: userA, accessToken: "a" }));
        expect(store.getState().theme.preference).toBe("dark");
        expect(readThemeCache()).toEqual({ userId: "user-a", theme: "dark" });
    });
});

describe("ThemeSync", () => {
    beforeEach(() => {
        clearThemeCache();
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "";
    });

    afterEach(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "";
        clearThemeCache();
    });

    it("applies the light theme", () => {
        mockMatchMedia(true);
        const store = createStore();
        store.dispatch(setThemePreference("light"));

        render(
            <Provider store={store}>
                <ThemeSync />
            </Provider>,
        );

        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("applies the dark theme", () => {
        mockMatchMedia(false);
        const store = createStore();
        store.dispatch(setThemePreference("dark"));

        render(
            <Provider store={store}>
                <ThemeSync />
            </Provider>,
        );

        expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("follows prefers-color-scheme when system is selected", () => {
        const media = mockMatchMedia(false);
        const store = createStore();
        store.dispatch(setThemePreference("system"));

        render(
            <Provider store={store}>
                <ThemeSync />
            </Provider>,
        );

        expect(document.documentElement.classList.contains("dark")).toBe(false);

        media.emit(true);

        expect(document.documentElement.classList.contains("dark")).toBe(true);
        expect(media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });

    it("does not listen for system changes when a fixed theme is selected", () => {
        const media = mockMatchMedia(true);
        const store = createStore();
        store.dispatch(setThemePreference("light"));

        render(
            <Provider store={store}>
                <ThemeSync />
            </Provider>,
        );

        expect(media.addEventListener).not.toHaveBeenCalled();
        expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
});

describe("SettingsPage", () => {
    beforeEach(() => {
        clearThemeCache();
        mockMatchMedia(false);
        updateTheme.mockReset();
        updateTheme.mockResolvedValue({ unwrap: async () => undefined });
    });

    it("selects light, dark, and system themes for the current user", () => {
        const store = createStore();
        store.dispatch(
            authSucceeded({
                user: createUser({ theme: "system" }),
                accessToken: "token",
            }),
        );

        render(
            <Provider store={store}>
                <SettingsPage />
            </Provider>,
        );

        expect(screen.getByRole("radio", { name: "System" })).toHaveAttribute(
            "aria-checked",
            "true",
        );

        fireEvent.click(screen.getByRole("radio", { name: "Light" }));
        expect(updateTheme).toHaveBeenCalledWith({ theme: "light" });

        fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
        expect(updateTheme).toHaveBeenCalledWith({ theme: "dark" });

        fireEvent.click(screen.getByRole("radio", { name: "System" }));
        expect(updateTheme).toHaveBeenCalledWith({ theme: "system" });
    });
});
