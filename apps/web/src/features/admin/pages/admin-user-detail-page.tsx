import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Can } from "@/components/auth/can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/features/admin/admin-error-messages";
import {
    useGetAdminRolesQuery,
    useGetAdminUserQuery,
    useSyncAdminUserRolesMutation,
    useUpdateAdminUserMutation,
} from "@/features/admin/api/adminApi";
import { PageHeader } from "@/features/admin/components/admin-ui";
import { SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";

export function AdminUserDetailPage() {
    const { id = "" } = useParams();
    const { data, isLoading } = useGetAdminUserQuery(id, { skip: !id });
    const { data: rolesData } = useGetAdminRolesQuery({ page: 1, perPage: 100 });
    const [updateUser, { isLoading: isSavingProfile }] = useUpdateAdminUserMutation();
    const [syncRoles, { isLoading: isSavingRoles }] = useSyncAdminUserRolesMutation();

    const user = data?.data.user;
    const [name, setName] = useState("");
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setSelectedRoles(user.roles);
        }
    }, [user]);

    if (isLoading || !user) {
        return <div className="text-sm text-slate-600">Loading user...</div>;
    }

    const statusLabel = user.deletedAt ? "Deleted" : user.isActive ? "Active" : "Inactive";

    return (
        <div className="space-y-6">
            <PageHeader title={user.name} description={user.email} />

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-medium text-slate-900">Profile</h2>
                    <dl className="mt-4 space-y-3 text-sm">
                        <div>
                            <dt className="text-slate-500">Email</dt>
                            <dd className="text-slate-900">{user.email}</dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Verified</dt>
                            <dd>{user.emailVerified ? "Yes" : "No"}</dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Status</dt>
                            <dd>
                                <Badge
                                    variant={
                                        user.deletedAt
                                            ? "danger"
                                            : user.isActive
                                              ? "success"
                                              : "warning"
                                    }
                                >
                                    {statusLabel}
                                </Badge>
                            </dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Created</dt>
                            <dd>{new Date(user.createdAt).toLocaleString()}</dd>
                        </div>
                        <div>
                            <dt className="text-slate-500">Updated</dt>
                            <dd>{new Date(user.updatedAt).toLocaleString()}</dd>
                        </div>
                    </dl>

                    <Can permission={SYSTEM_PERMISSIONS.USERS_UPDATE}>
                        <div className="mt-6 space-y-3">
                            <label className="block text-sm font-medium text-slate-700">Name</label>
                            <Input value={name} onChange={(event) => setName(event.target.value)} />
                            <Button
                                disabled={isSavingProfile}
                                onClick={async () => {
                                    try {
                                        await updateUser({ id: user.id, name }).unwrap();
                                        toast.success("User updated.");
                                    } catch (error) {
                                        toast.error(getAdminErrorMessage(error));
                                    }
                                }}
                            >
                                Save profile
                            </Button>
                        </div>
                    </Can>
                </div>

                <Can permission={SYSTEM_PERMISSIONS.USERS_ROLES_MANAGE}>
                    <div className="rounded-lg border border-slate-200 bg-white p-6">
                        <h2 className="text-lg font-medium text-slate-900">Roles</h2>
                        <div className="mt-4 space-y-2">
                            {(rolesData?.data.items ?? []).map((role) => (
                                <label key={role.id} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedRoles.includes(role.name)}
                                        onChange={(event) => {
                                            setSelectedRoles((current) =>
                                                event.target.checked
                                                    ? [...current, role.name]
                                                    : current.filter((item) => item !== role.name),
                                            );
                                        }}
                                    />
                                    <span>{role.label}</span>
                                    <span className="text-slate-500">({role.name})</span>
                                </label>
                            ))}
                        </div>
                        <Button
                            className="mt-4"
                            disabled={isSavingRoles}
                            onClick={async () => {
                                try {
                                    await syncRoles({ id: user.id, roles: selectedRoles }).unwrap();
                                    toast.success("Roles updated.");
                                } catch (error) {
                                    toast.error(getAdminErrorMessage(error));
                                }
                            }}
                        >
                            Save roles
                        </Button>
                    </div>
                </Can>
            </div>
        </div>
    );
}
