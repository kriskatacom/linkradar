import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { clearAuth } from "@/features/auth/authSlice";

const STORAGE_KEY = "linkradar.currentWorkspaceId";

function readStoredWorkspaceId(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export type WorkspaceState = {
    currentWorkspaceId: string | null;
};

const initialState: WorkspaceState = {
    currentWorkspaceId: readStoredWorkspaceId(),
};

const workspaceSlice = createSlice({
    name: "workspace",
    initialState,
    reducers: {
        setCurrentWorkspaceId(state, action: PayloadAction<string | null>) {
            state.currentWorkspaceId = action.payload;
            try {
                if (action.payload) {
                    localStorage.setItem(STORAGE_KEY, action.payload);
                } else {
                    localStorage.removeItem(STORAGE_KEY);
                }
            } catch {
                // Ignore storage failures in private browsing / tests.
            }
        },
        clearCurrentWorkspace(state) {
            state.currentWorkspaceId = null;
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore storage failures.
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(clearAuth, (state) => {
            state.currentWorkspaceId = null;
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Ignore storage failures.
            }
        });
    },
});

export const { setCurrentWorkspaceId, clearCurrentWorkspace } = workspaceSlice.actions;
export const workspaceReducer = workspaceSlice.reducer;
