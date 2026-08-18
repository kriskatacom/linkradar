import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { AuthUser } from "./types";

export type AuthState = {
    user: AuthUser | null;
    accessToken: string | null;
    initialized: boolean;
};

const initialState: AuthState = {
    user: null,
    accessToken: null,
    initialized: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser(state, action: PayloadAction<AuthUser | null>) {
            state.user = action.payload;
        },
        setCredentials(state, action: PayloadAction<{ accessToken: string }>) {
            state.accessToken = action.payload.accessToken;
        },
        authSucceeded(state, action: PayloadAction<{ user: AuthUser; accessToken: string }>) {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
        },
        clearAuth(state) {
            state.user = null;
            state.accessToken = null;
        },
        setInitialized(state, action: PayloadAction<boolean>) {
            state.initialized = action.payload;
        },
    },
});

export const { setUser, setCredentials, authSucceeded, clearAuth, setInitialized } =
    authSlice.actions;
export const authReducer = authSlice.reducer;
