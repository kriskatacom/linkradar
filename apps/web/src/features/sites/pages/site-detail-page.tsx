import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoItem } from "@/components/ui/info-item";
import { PageHeader } from "@/features/admin/components/admin-ui";
import { useGetSiteQuery } from "@/features/workspaces/api/workspaceApi";
import { useAppSelector } from "@/hooks/redux";
import { getApiError } from "@/lib/api-error";

export function SiteDetailPage() {
    const { siteId = "" } = useParams();
    const workspaceId = useAppSelector((state) => state.workspace.currentWorkspaceId);
    const { data, isLoading, error } = useGetSiteQuery(
        { workspaceId: workspaceId ?? "", siteId },
        { skip: !workspaceId || !siteId },
    );
    const site = data?.data.site;

    if (!workspaceId) {
        return <Alert>Select a workspace to view this site.</Alert>;
    }

    if (isLoading) {
        return <div className="text-sm text-slate-600">Loading site...</div>;
    }

    if (error || !site) {
        return <Alert>{getApiError(error).message}</Alert>;
    }

    const statusLabel = site.deletedAt ? "Deleted" : site.isActive ? "Active" : "Inactive";

    return (
        <div className="space-y-6">
            <PageHeader
                title={site.name}
                description={site.url}
                actions={
                    <Link to={`/app/sites/${site.id}/settings`}>
                        <Button type="button" variant="outline">
                            Settings
                        </Button>
                    </Link>
                }
            />

            <div className="rounded-lg border border-slate-200 bg-white p-6">
                <dl className="space-y-2">
                    <InfoItem label="URL">
                        <span className="block truncate" title={site.url}>
                            {site.url}
                        </span>
                    </InfoItem>
                    <InfoItem label="Status">
                        <Badge
                            variant={
                                site.deletedAt ? "danger" : site.isActive ? "success" : "warning"
                            }
                        >
                            {statusLabel}
                        </Badge>
                    </InfoItem>
                    <InfoItem label="Last scanned">
                        {site.lastScannedAt
                            ? new Date(site.lastScannedAt).toLocaleString()
                            : "Never"}
                    </InfoItem>
                    <InfoItem label="Created">
                        {new Date(site.createdAt).toLocaleString()}
                    </InfoItem>
                </dl>

                <div className="mt-6 space-y-2">
                    <Button
                        type="button"
                        disabled
                        onClick={() => toast.message("Scanning will be implemented next.")}
                    >
                        Start scan
                    </Button>
                    <p className="text-sm text-slate-500">Scanning will be implemented next.</p>
                </div>
            </div>
        </div>
    );
}
