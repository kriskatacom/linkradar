import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { authSucceeded, clearAuth, setUser } from "@/features/auth/authSlice";
import type { AuthUser } from "@/features/auth/types";

import {
    clearThemeCache,
    DEFAULT_THEME_PREFERENCE,
    parseThemePreference,
    readThemeCache,
    type ThemePreference,
    writeThemeCache,
} from "./theme";

export type ThemeState = {
    preference: ThemePreference;
    userId: string | null;
};

const cached = readThemeCache();

const initialState: ThemeState = {
    preference: cached?.theme ?? DEFAULT_THEME_PREFERENCE,
    userId: cached?.userId ?? null,
};

function applyUserTheme(state: ThemeState, user: AuthUser): void {
    state.userId = user.id;
    state.preference = parseThemePreference(user.theme);
    writeThemeCache(user.id, state.preference);
}

function resetThemeState(state: ThemeState): void {
    state.userId = null;
    state.preference = DEFAULT_THEME_PREFERENCE;
    clearThemeCache();
}

const themeSlice = createSlice({
    name: "theme",
    initialState,
    reducers: {
        setThemePreference(state, action: PayloadAction<ThemePreference>) {
            state.preference = action.payload;
            if (state.userId) {
                writeThemeCache(state.userId, action.payload);
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(authSucceeded, (state, action) => {
            applyUserTheme(state, action.payload.user);
        });
        builder.addCase(setUser, (state, action) => {
            if (action.payload) {
                applyUserTheme(state, action.payload);
            } else {
                resetThemeState(state);
            }
        });
        builder.addCase(clearAuth, (state) => {
            resetThemeState(state);
        });
    },
});

export const { setThemePreference } = themeSlice.actions;
export const themeReducer = themeSlice.reducer;
