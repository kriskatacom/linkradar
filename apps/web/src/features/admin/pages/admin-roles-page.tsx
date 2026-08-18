import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Can } from "@/components/auth/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    useCreateAdminRoleMutation,
    useDeleteAdminRoleMutation,
    useGetAdminRolesQuery,
} from "@/features/admin/api/adminApi";
import { AlertDialog, PageHeader } from "@/features/admin/components/admin-ui";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";

export function AdminRolesPage() {
    const { data, isLoading } = useGetAdminRolesQuery({ page: 1, perPage: 50 });
    const [createRole, { isLoading: isCreating }] = useCreateAdminRoleMutation();
    const [deleteRole] = useDeleteAdminRoleMutation();
    const [name, setName] = useState("");
    const [label, setLabel] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

    const items = data?.data.items ?? [];

    return (
        <div>
            <PageHeader title="Roles" description="Manage role definitions and permission assignments." />

            <Can permission={SYSTEM_PERMISSIONS.ROLES_CREATE}>
                <div className="mb-6 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3">
                    <Input placeholder="name (manager)" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
                    <Button
                        loading={isCreating}
                        loadingText="Creating..."
                        onClick={async () => {
                            try {
                                await createRole({ name, label }).unwrap();
                                setName("");
                                setLabel("");
                                toast.success("Role created.");
                            } catch (error) {
                                toast.error(getAdminErrorMessage(error));
                            }
                        }}
                    >
                        Create role
                    </Button>
                </div>
            </Can>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>Name</TableHeaderCell>
                        <TableHeaderCell>Label</TableHeaderCell>
                        <TableHeaderCell>Users</TableHeaderCell>
                        <TableHeaderCell>Permissions</TableHeaderCell>
                        <TableHeaderCell>Type</TableHeaderCell>
                        <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell>Loading roles...</TableCell>
                        </TableRow>
                    ) : (
                        items.map((role) => (
                            <TableRow key={role.id}>
                                <TableCell>{role.name}</TableCell>
                                <TableCell>{role.label}</TableCell>
                                <TableCell>{role.usersCount ?? 0}</TableCell>
                                <TableCell>{role.permissionsCount ?? 0}</TableCell>
                                <TableCell>
                                    <Badge variant={role.isSystem ? "info" : "default"}>
                                        {role.isSystem ? "System" : "Custom"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Link to={`/app/admin/roles/${role.id}`}>
                                            <Button variant="outline" size="sm">
                                                Edit
                                            </Button>
                                        </Link>
                                        <Can permission={SYSTEM_PERMISSIONS.ROLES_DELETE}>
                                            {!role.isSystem ? (
                                                <Button
                                                    size="sm"
                                                    className="bg-red-600 hover:bg-red-700"
                                                    onClick={() =>
                                                        setDeleteTarget({ id: role.id, label: role.label })
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            ) : null}
                                        </Can>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <AlertDialog
                open={deleteTarget !== null}
                title="Delete role?"
                description={`Delete ${deleteTarget?.label ?? "this role"} permanently.`}
                confirmLabel="Delete role"
                destructive
                onCancel={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) {
                        return;
                    }
                    try {
                        await deleteRole(deleteTarget.id).unwrap();
                        toast.success("Role deleted.");
                    } catch (error) {
                        toast.error(getAdminErrorMessage(error));
                    } finally {
                        setDeleteTarget(null);
                    }
                }}
            />
        </div>
    );
}
