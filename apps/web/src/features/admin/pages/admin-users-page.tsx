import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Can } from "@/components/auth/can";
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
import { getAdminErrorMessage } from "@/features/admin/admin-error-messages";
import {
    useActivateAdminUserMutation,
    useDeactivateAdminUserMutation,
    useDeleteAdminUserMutation,
    useGetAdminUsersQuery,
    useRestoreAdminUserMutation,
} from "@/features/admin/api/adminApi";
import { AlertDialog, PageHeader } from "@/features/admin/components/admin-ui";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";

function userStatus(user: { deletedAt: string | null; isActive: boolean }) {
    if (user.deletedAt) {
        return { label: "Deleted", variant: "danger" as const };
    }
    if (!user.isActive) {
        return { label: "Inactive", variant: "warning" as const };
    }
    return { label: "Active", variant: "success" as const };
}

export function AdminUsersPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [role, setRole] = useState("");
    const [pendingAction, setPendingAction] = useState<{
        type: "delete" | "deactivate";
        userId: string;
        userName: string;
    } | null>(null);

    const queryArgs = useMemo(
        () => ({
            page,
            perPage: 20,
            search: search || undefined,
            status: status || undefined,
            role: role || undefined,
        }),
        [page, role, search, status],
    );

    const { data, isLoading } = useGetAdminUsersQuery(queryArgs);
    const [deactivateUser] = useDeactivateAdminUserMutation();
    const [activateUser] = useActivateAdminUserMutation();
    const [deleteUser] = useDeleteAdminUserMutation();
    const [restoreUser] = useRestoreAdminUserMutation();

    const items = data?.data.items ?? [];
    const pagination = data?.data.pagination;

    async function runPendingAction() {
        if (!pendingAction) {
            return;
        }

        try {
            if (pendingAction.type === "delete") {
                await deleteUser(pendingAction.userId).unwrap();
                toast.success("User deleted.");
            } else {
                await deactivateUser(pendingAction.userId).unwrap();
                toast.success("User deactivated.");
            }
        } catch (error) {
            toast.error(getAdminErrorMessage(error));
        } finally {
            setPendingAction(null);
        }
    }

    return (
        <div>
            <PageHeader title="Users" description="Search, filter, and manage workspace users." />

            <div className="mb-4 grid gap-3 md:grid-cols-4">
                <Input
                    placeholder="Search name or email"
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
                    <option value="">Non-deleted users</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="deleted">Deleted</option>
                    <option value="all">All</option>
                </Select>
                <Select
                    value={role}
                    onChange={(event) => {
                        setRole(event.target.value);
                        setPage(1);
                    }}
                >
                    <option value="">All roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                </Select>
            </div>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>User</TableHeaderCell>
                        <TableHeaderCell>Email</TableHeaderCell>
                        <TableHeaderCell>Roles</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell>Created</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell>Loading users...</TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                        </TableRow>
                    ) : items.length === 0 ? (
                        <TableRow>
                            <TableCell>No users found.</TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                        </TableRow>
                    ) : (
                        items.map((user) => {
                            const statusBadge = userStatus(user);
                            return (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{user.name}</div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.roles.join(", ") || "—"}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-2">
                                            <Can permission={SYSTEM_PERMISSIONS.USERS_VIEW}>
                                                <Link to={`/app/admin/users/${user.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        View
                                                    </Button>
                                                </Link>
                                            </Can>
                                            <Can permission={SYSTEM_PERMISSIONS.USERS_UPDATE}>
                                                {!user.deletedAt && !user.isActive ? (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={async () => {
                                                            try {
                                                                await activateUser(user.id).unwrap();
                                                                toast.success("User activated.");
                                                            } catch (error) {
                                                                toast.error(getAdminErrorMessage(error));
                                                            }
                                                        }}
                                                    >
                                                        Activate
                                                    </Button>
                                                ) : null}
                                                {!user.deletedAt && user.isActive ? (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() =>
                                                            setPendingAction({
                                                                type: "deactivate",
                                                                userId: user.id,
                                                                userName: user.name,
                                                            })
                                                        }
                                                    >
                                                        Deactivate
                                                    </Button>
                                                ) : null}
                                                {user.deletedAt ? (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={async () => {
                                                            try {
                                                                await restoreUser(user.id).unwrap();
                                                                toast.success("User restored.");
                                                            } catch (error) {
                                                                toast.error(getAdminErrorMessage(error));
                                                            }
                                                        }}
                                                    >
                                                        Restore
                                                    </Button>
                                                ) : null}
                                            </Can>
                                            <Can permission={SYSTEM_PERMISSIONS.USERS_DELETE}>
                                                {!user.deletedAt ? (
                                                    <Button
                                                        size="sm"
                                                        className="bg-red-600 hover:bg-red-700"
                                                        onClick={() =>
                                                            setPendingAction({
                                                                type: "delete",
                                                                userId: user.id,
                                                                userName: user.name,
                                                            })
                                                        }
                                                    >
                                                        Delete
                                                    </Button>
                                                ) : null}
                                            </Can>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            {pagination ? (
                <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                    <span>
                        Page {pagination.page} of {pagination.totalPages || 1}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.page <= 1}
                            onClick={() => setPage((value) => Math.max(1, value - 1))}
                        >
                            Previous
                        </Button>
                        <Button
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

            <AlertDialog
                open={pendingAction !== null}
                title={
                    pendingAction?.type === "delete" ? "Delete user?" : "Deactivate user?"
                }
                description={`This will ${pendingAction?.type === "delete" ? "soft delete" : "deactivate"} ${pendingAction?.userName ?? "this user"}.`}
                confirmLabel={pendingAction?.type === "delete" ? "Delete user" : "Deactivate"}
                destructive
                onCancel={() => setPendingAction(null)}
                onConfirm={runPendingAction}
            />
        </div>
    );
}
