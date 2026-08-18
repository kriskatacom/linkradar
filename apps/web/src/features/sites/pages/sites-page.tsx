import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { Can } from "@/components/auth/can";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/features/admin/components/admin-ui";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";
import { useGetSitesQuery, useGetWorkspacesQuery } from "@/features/workspaces/api/workspaceApi";
import { useAppSelector } from "@/hooks/redux";
import { getApiError } from "@/lib/api-error";

function siteStatus(site: { deletedAt: string | null; isActive: boolean }) {
    if (site.deletedAt) {
        return { label: "Deleted", variant: "danger" as const };
    }
    if (!site.isActive) {
        return { label: "Inactive", variant: "warning" as const };
    }
    return { label: "Active", variant: "success" as const };
}

export function SitesPage() {
    const workspaceId = useAppSelector((state) => state.workspace.currentWorkspaceId);
    const { data: workspacesData } = useGetWorkspacesQuery();
    const currentWorkspace = workspacesData?.data.items.find((item) => item.id === workspaceId);
    const canWriteSites = currentWorkspace ? currentWorkspace.role !== "viewer" : false;

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const queryArgs = useMemo(
        () => ({
            workspaceId: workspaceId ?? "",
            page,
            perPage: 20,
            search: search || undefined,
            status: status || undefined,
        }),
        [page, search, status, workspaceId],
    );

    const { data, isLoading, error } = useGetSitesQuery(queryArgs, {
        skip: !workspaceId,
    });

    const items = data?.data.items ?? [];
    const pagination = data?.data.pagination;

    if (!workspaceId) {
        return (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="text-sm font-medium text-slate-900">No workspace selected.</p>
                <p className="mt-1 text-sm text-slate-600">
                    Create or select a workspace to manage websites.
                </p>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Sites"
                description="Websites in the current workspace."
                actions={
                    canWriteSites ? (
                        <Can permission={SYSTEM_PERMISSIONS.SITES_CREATE}>
                            <Link to="/app/sites/new">
                                <Button type="button">Add website</Button>
                            </Link>
                        </Can>
                    ) : null
                }
            />

            <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Input
                    placeholder="Search name or URL"
                    value={search}
                    onChange={(event) => {
                        setSearch(event.target.value);
                        setPage(1);
                    }}
                />
                <Select
                    value={status}
                    onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">Active and inactive</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="deleted">Deleted</option>
                    <option value="all">All</option>
                </Select>
            </div>

            {error ? <Alert className="mb-4">{getApiError(error).message}</Alert> : null}

            {isLoading ? (
                <div className="text-sm text-slate-600">Loading sites...</div>
            ) : items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
                    <p className="text-sm font-medium text-slate-900">No websites yet.</p>
                    <p className="mt-1 text-sm text-slate-600">
                        Add your first website to start scanning.
                    </p>
                    {canWriteSites ? (
                        <Can permission={SYSTEM_PERMISSIONS.SITES_CREATE}>
                            <Link to="/app/sites/new">
                                <Button type="button" className="mt-4">
                                    Add website
                                </Button>
                            </Link>
                        </Can>
                    ) : null}
                </div>
            ) : (
                <>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeaderCell>Site</TableHeaderCell>
                                <TableHeaderCell>URL</TableHeaderCell>
                                <TableHeaderCell>Status</TableHeaderCell>
                                <TableHeaderCell>Last scan</TableHeaderCell>
                                <TableHeaderCell>Created</TableHeaderCell>
                                <TableHeaderCell>Actions</TableHeaderCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items.map((site) => {
                                const statusMeta = siteStatus(site);
                                return (
                                    <TableRow key={site.id}>
                                        <TableCell>
                                            <Link
                                                className="font-medium text-slate-900 hover:underline"
                                                to={`/app/sites/${site.id}`}
                                            >
                                                {site.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="max-w-[280px] truncate">
                                            {site.url}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusMeta.variant}>
                                                {statusMeta.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {site.lastScannedAt
                                                ? new Date(site.lastScannedAt).toLocaleString()
                                                : "Never"}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(site.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Link to={`/app/sites/${site.id}`}>
                                                    <Button type="button" variant="outline" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
                                                <Link to={`/app/sites/${site.id}/settings`}>
                                                    <Button type="button" variant="ghost" size="sm">
                                                        Settings
                                                    </Button>
                                                </Link>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {pagination && pagination.totalPages > 1 ? (
                        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                            <span>
                                Page {pagination.page} of {pagination.totalPages}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPage((value) => value - 1)}
                                >
                                    Previous
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPage((value) => value + 1)}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}
