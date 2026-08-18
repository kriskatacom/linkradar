import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoItem } from "@/components/ui/info-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/features/admin/components/admin-ui";
import {
    useGetWorkspaceQuery,
    useUpdateWorkspaceMutation,
} from "@/features/workspaces/api/workspaceApi";
import { getApiError } from "@/lib/api-error";

export function WorkspaceSettingsPage() {
    const { id = "" } = useParams();
    const { data, isLoading, error } = useGetWorkspaceQuery(id, { skip: !id });
    const [updateWorkspace, { isLoading: isSaving }] = useUpdateWorkspaceMutation();
    const workspace = data?.data.workspace;
    const [name, setName] = useState("");

    useEffect(() => {
        if (workspace) {
            setName(workspace.name);
        }
    }, [workspace]);

    if (isLoading) {
        return <div className="text-sm text-slate-600">Loading workspace...</div>;
    }

    if (error || !workspace) {
        return <Alert>{getApiError(error).message}</Alert>;
    }

    const canRename = workspace.role === "owner" || workspace.role === "admin";

    return (
        <div className="space-y-6">
            <PageHeader title={workspace.name} description="Workspace settings" />

            <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-medium text-slate-900">Basic info</h2>
                <dl className="mt-4 space-y-2">
                    <InfoItem label="Slug">{workspace.slug}</InfoItem>
                    <InfoItem label="Your role">{workspace.role}</InfoItem>
                    <InfoItem label="Members">{workspace.membersCount}</InfoItem>
                    <InfoItem label="Created">
                        {new Date(workspace.createdAt).toLocaleString()}
                    </InfoItem>
                </dl>
            </div>

            {canRename ? (
                <form
                    className="max-w-lg space-y-3 rounded-lg border border-slate-200 bg-white p-6"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        try {
                            await updateWorkspace({ id: workspace.id, name }).unwrap();
                            toast.success("Workspace renamed.");
                        } catch (submitError) {
                            toast.error(getApiError(submitError).message);
                        }
                    }}
                >
                    <div className="space-y-2">
                        <Label htmlFor="workspace-name">Name</Label>
                        <Input
                            id="workspace-name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </div>
                    <Button type="submit" loading={isSaving} loadingText="Saving...">
                        Save changes
                    </Button>
                </form>
            ) : (
                <p className="text-sm text-slate-600">
                    Only workspace owners and admins can rename this workspace.
                </p>
            )}
        </div>
    );
}
