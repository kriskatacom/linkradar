import { beforeEach, describe, expect, it } from "vitest";

import { clearAuth } from "@/features/auth/authSlice";
import {
    clearCurrentWorkspace,
    setCurrentWorkspaceId,
    workspaceReducer,
} from "@/features/workspaces/workspaceSlice";

describe("workspace reducer", () => {
    beforeEach(() => {
        localStorage.removeItem("linkradar.currentWorkspaceId");
    });
    it("stores the current workspace id", () => {
        const state = workspaceReducer(undefined, setCurrentWorkspaceId("ws-1"));
        expect(state.currentWorkspaceId).toBe("ws-1");
    });

    it("clears the current workspace on logout", () => {
        const selected = workspaceReducer(undefined, setCurrentWorkspaceId("ws-1"));
        const state = workspaceReducer(selected, clearAuth());
        expect(state.currentWorkspaceId).toBeNull();
    });

    it("clears the current workspace explicitly", () => {
        const selected = workspaceReducer(undefined, setCurrentWorkspaceId("ws-1"));
        const state = workspaceReducer(selected, clearCurrentWorkspace());
        expect(state.currentWorkspaceId).toBeNull();
    });
});
