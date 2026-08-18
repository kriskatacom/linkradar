import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, PageHeader } from "@/features/admin/components/admin-ui";
import {
    useDeleteSiteMutation,
    useGetSiteQuery,
    useRestoreSiteMutation,
    useUpdateSiteMutation,
} from "@/features/workspaces/api/workspaceApi";
import { useAppSelector } from "@/hooks/redux";
import { getApiError } from "@/lib/api-error";

export function SiteSettingsPage() {
    const { siteId = "" } = useParams();
    const navigate = useNavigate();
    const workspaceId = useAppSelector((state) => state.workspace.currentWorkspaceId);
    const { data, isLoading, error } = useGetSiteQuery(
        { workspaceId: workspaceId ?? "", siteId },
        { skip: !workspaceId || !siteId },
    );
    const [updateSite, { isLoading: isSaving }] = useUpdateSiteMutation();
    const [deleteSite, { isLoading: isDeleting }] = useDeleteSiteMutation();
    const [restoreSite, { isLoading: isRestoring }] = useRestoreSiteMutation();
    const site = data?.data.site;
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        if (site) {
            setName(site.name);
            setUrl(site.url);
        }
    }, [site]);

    if (!workspaceId) {
        return <Alert>Select a workspace to edit this site.</Alert>;
    }

    if (isLoading) {
        return <div className="text-sm text-slate-600">Loading site...</div>;
    }

    if (error || !site) {
        return <Alert>{getApiError(error).message}</Alert>;
    }

    return (
        <div className="space-y-6">
            <PageHeader title={`${site.name} settings`} description={site.url} />

            <form
                className="max-w-lg space-y-4 rounded-lg border border-slate-200 bg-white p-6"
                onSubmit={async (event) => {
                    event.preventDefault();
                    try {
                        await updateSite({
                            workspaceId,
                            siteId: site.id,
                            name,
                            url,
                        }).unwrap();
                        toast.success("Site updated.");
                    } catch (submitError) {
                        toast.error(getApiError(submitError).message);
                    }
                }}
            >
                <div className="space-y-2">
                    <Label htmlFor="settings-name">Name</Label>
                    <Input
                        id="settings-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="settings-url">Website URL</Label>
                    <Input
                        id="settings-url"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                    />
                </div>
                <Button type="submit" loading={isSaving} loadingText="Saving...">
                    Save changes
                </Button>
            </form>

            {site.deletedAt ? (
                <Button
                    type="button"
                    variant="outline"
                    loading={isRestoring}
                    loadingText="Restoring..."
                    onClick={async () => {
                        try {
                            await restoreSite({ workspaceId, siteId: site.id }).unwrap();
                            toast.success("Site restored.");
                        } catch (restoreError) {
                            toast.error(getApiError(restoreError).message);
                        }
                    }}
                >
                    Restore site
                </Button>
            ) : (
                <Button type="button" variant="outline" className="text-red-600" onClick={() => setConfirmDelete(true)}>
                    Delete site
                </Button>
            )}

            <AlertDialog
                open={confirmDelete}
                title="Delete website?"
                description="The site will be soft-deleted and can be restored later."
                confirmLabel={isDeleting ? "Deleting..." : "Delete"}
                destructive
                onCancel={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    try {
                        await deleteSite({ workspaceId, siteId: site.id }).unwrap();
                        toast.success("Site deleted.");
                        setConfirmDelete(false);
                        navigate("/app/sites");
                    } catch (deleteError) {
                        toast.error(getApiError(deleteError).message);
                    }
                }}
            />
        </div>
    );
}
