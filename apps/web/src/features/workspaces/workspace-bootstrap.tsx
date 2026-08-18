import { useEffect } from "react";

import { workspaceApi } from "@/features/workspaces/api/workspaceApi";
import { resolveCurrentWorkspaceId } from "@/features/workspaces/resolve-current-workspace";
import { setCurrentWorkspaceId } from "@/features/workspaces/workspaceSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";

export function WorkspaceBootstrap({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const currentWorkspaceId = useAppSelector((state) => state.workspace.currentWorkspaceId);

    useEffect(() => {
        if (!user) {
            return;
        }

        let isMounted = true;

        const selectWorkspace = async () => {
            try {
                const result = await dispatch(workspaceApi.endpoints.getWorkspaces.initiate()).unwrap();
                if (!isMounted) {
                    return;
                }

                const nextId = resolveCurrentWorkspaceId(result.data.items, currentWorkspaceId);
                if (nextId !== currentWorkspaceId) {
                    dispatch(setCurrentWorkspaceId(nextId));
                }
            } catch {
                if (isMounted) {
                    dispatch(setCurrentWorkspaceId(null));
                }
            }
        };

        void selectWorkspace();

        return () => {
            isMounted = false;
        };
    }, [currentWorkspaceId, dispatch, user]);

    return <>{children}</>;
}
