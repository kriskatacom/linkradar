import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/admin/components/admin-ui";
import { useGetWorkspacesQuery } from "@/features/workspaces/api/workspaceApi";
import { setCurrentWorkspaceId } from "@/features/workspaces/workspaceSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";

export function WorkspacesPage() {
    const dispatch = useAppDispatch();
    const currentWorkspaceId = useAppSelector((state) => state.workspace.currentWorkspaceId);
    const { data, isLoading } = useGetWorkspacesQuery();
    const items = data?.data.items ?? [];

    if (isLoading) {
        return <div className="text-sm text-slate-600">Loading workspaces...</div>;
    }

    return (
        <div>
            <PageHeader
                title="Workspaces"
                description="Switch between workspaces you belong to."
            />

            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                    <p className="text-sm font-medium text-slate-900">No workspaces found.</p>
                    <p className="mt-1 text-sm text-slate-600">
                        A personal workspace should be created when you register. Try signing in
                        again.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((workspace) => (
                        <div
                            key={workspace.id}
                            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                            <div>
                                <div className="font-medium text-slate-900">{workspace.name}</div>
                                <div className="text-sm text-slate-500">
                                    Role: {workspace.role} · {workspace.membersCount} member
                                    {workspace.membersCount === 1 ? "" : "s"}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {workspace.id !== currentWorkspaceId ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => dispatch(setCurrentWorkspaceId(workspace.id))}
                                    >
                                        Switch
                                    </Button>
                                ) : (
                                    <span className="self-center text-xs font-medium text-slate-500">
                                        Current
                                    </span>
                                )}
                                <Link to={`/app/workspaces/${workspace.id}/settings`}>
                                    <Button type="button" variant="secondary">
                                        Settings
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
