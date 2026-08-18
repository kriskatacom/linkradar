import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/features/admin/admin-error-messages";
import {
    useGetAdminPermissionsQuery,
    useGetAdminRoleQuery,
    useSyncAdminRolePermissionsMutation,
    useUpdateAdminRoleMutation,
} from "@/features/admin/api/adminApi";
import { PageHeader } from "@/features/admin/components/admin-ui";
import { groupPermissionsByResource, SYSTEM_PERMISSIONS } from "@/features/auth/system-permissions";

export function AdminRoleDetailPage() {
    const { id = "" } = useParams();
    const { data, isLoading } = useGetAdminRoleQuery(id, { skip: !id });
    const { data: permissionsData } = useGetAdminPermissionsQuery();
    const [updateRole, { isLoading: isSavingLabel }] = useUpdateAdminRoleMutation();
    const [syncPermissions, { isLoading: isSavingPermissions }] =
        useSyncAdminRolePermissionsMutation();

    const role = data?.data.role;
    const [label, setLabel] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const permissions = permissionsData?.data.items ?? [];
    const grouped = groupPermissionsByResource(permissions);
    const readOnlyPermissions = role?.name === "admin";

    useEffect(() => {
        if (role) {
            setLabel(role.label);
            setSelectedPermissions(role.permissions ?? []);
        }
    }, [role]);

    if (isLoading || !role) {
        return <div className="text-sm text-slate-600">Loading role...</div>;
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={role.label}
                description={`Role key: ${role.name}${role.isSystem ? " · System role" : ""}`}
            />

            <Can permission={SYSTEM_PERMISSIONS.ROLES_UPDATE}>
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-medium text-slate-900">Details</h2>
                    <div className="mt-4 max-w-md space-y-3">
                        <div>
                            <label className="text-sm text-slate-500">Name</label>
                            <Input value={role.name} disabled />
                        </div>
                        <div>
                            <label className="text-sm text-slate-500">Label</label>
                            <Input
                                value={label}
                                disabled={role.isSystem && role.name === "admin"}
                                onChange={(event) => setLabel(event.target.value)}
                            />
                        </div>
                        {!readOnlyPermissions ? (
                            <Button
                                loading={isSavingLabel}
                                loadingText="Saving..."
                                onClick={async () => {
                                    try {
                                        await updateRole({ id: role.id, label }).unwrap();
                                        toast.success("Role updated.");
                                    } catch (error) {
                                        toast.error(getAdminErrorMessage(error));
                                    }
                                }}
                            >
                                Save label
                            </Button>
                        ) : null}
                    </div>
                </div>
            </Can>

            <Can permission={SYSTEM_PERMISSIONS.ROLES_PERMISSIONS_MANAGE}>
                <div className="rounded-lg border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-medium text-slate-900">Permissions</h2>
                    {readOnlyPermissions ? (
                        <p className="mt-2 text-sm text-slate-600">
                            Administrator permissions are managed by the system and are read-only here.
                        </p>
                    ) : null}
                    <div className="mt-4 space-y-6">
                        {grouped.map((group) => (
                            <div key={group.group}>
                                <h3 className="font-medium text-slate-900">{group.group}</h3>
                                <div className="mt-2 space-y-2">
                                    {group.items.map((permission) => (
                                        <label
                                            key={permission.name}
                                            className="flex items-start gap-2 text-sm"
                                        >
                                            <Checkbox
                                                className="mt-0.5"
                                                disabled={readOnlyPermissions}
                                                checked={selectedPermissions.includes(permission.name)}
                                                onChange={(event) => {
                                                    setSelectedPermissions((current) =>
                                                        event.target.checked
                                                            ? [...current, permission.name]
                                                            : current.filter(
                                                                  (item) => item !== permission.name,
                                                              ),
                                                    );
                                                }}
                                            />
                                            <span>
                                                <span className="font-medium">{permission.label}</span>
                                                <span className="block text-slate-500">
                                                    {permission.name}
                                                    {permission.description
                                                        ? ` · ${permission.description}`
                                                        : ""}
                                                </span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    {!readOnlyPermissions ? (
                        <Button
                            className="mt-4"
                            loading={isSavingPermissions}
                            loadingText="Saving..."
                            onClick={async () => {
                                try {
                                    await syncPermissions({
                                        id: role.id,
                                        permissions: selectedPermissions,
                                    }).unwrap();
                                    toast.success("Permissions updated.");
                                } catch (error) {
                                    toast.error(getAdminErrorMessage(error));
                                }
                            }}
                        >
                            Save permissions
                        </Button>
                    ) : null}
                </div>
            </Can>
        </div>
    );
}
