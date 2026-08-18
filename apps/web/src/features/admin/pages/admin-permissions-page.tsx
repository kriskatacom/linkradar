import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from "@/components/ui/table";
import { useGetAdminPermissionsQuery } from "@/features/admin/api/adminApi";
import { PageHeader } from "@/features/admin/components/admin-ui";

export function AdminPermissionsPage() {
    const { data, isLoading } = useGetAdminPermissionsQuery();
    const [search, setSearch] = useState("");
    const items = data?.data.items ?? [];

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) {
            return items;
        }
        return items.filter(
            (permission) =>
                permission.name.toLowerCase().includes(term) ||
                permission.label.toLowerCase().includes(term) ||
                (permission.description ?? "").toLowerCase().includes(term),
        );
    }, [items, search]);

    return (
        <div>
            <PageHeader
                title="Permissions"
                description="Read-only list of system permissions managed by bootstrap."
            />

            <div className="mb-4 max-w-md">
                <Input
                    placeholder="Search permissions"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </div>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableHeaderCell>Permission</TableHeaderCell>
                        <TableHeaderCell>Label</TableHeaderCell>
                        <TableHeaderCell>Description</TableHeaderCell>
                        <TableHeaderCell>Used by roles</TableHeaderCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell>Loading permissions...</TableCell>
                        </TableRow>
                    ) : (
                        filtered.map((permission) => (
                            <TableRow key={permission.id}>
                                <TableCell>{permission.name}</TableCell>
                                <TableCell>{permission.label}</TableCell>
                                <TableCell>{permission.description ?? "—"}</TableCell>
                                <TableCell>{permission.usedByRoles.join(", ") || "—"}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
