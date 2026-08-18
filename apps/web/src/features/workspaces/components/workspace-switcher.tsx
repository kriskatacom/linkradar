import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetWorkspacesQuery } from "@/features/workspaces/api/workspaceApi";
import { setCurrentWorkspaceId } from "@/features/workspaces/workspaceSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
    const [open, setOpen] = useState(false);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currentWorkspaceId = useAppSelector((state) => state.workspace.currentWorkspaceId);
    const { data, isLoading } = useGetWorkspacesQuery();
    const workspaces = data?.data.items ?? [];

    const current = useMemo(
        () => workspaces.find((workspace) => workspace.id === currentWorkspaceId) ?? workspaces[0],
        [currentWorkspaceId, workspaces],
    );

    if (isLoading && workspaces.length === 0) {
        return <span className="text-sm text-slate-500">Loading workspace...</span>;
    }

    if (!current) {
        return <span className="text-sm text-slate-500">No workspace</span>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger onClick={() => setOpen((value) => !value)}>
                <span
                    className={cn(
                        "inline-flex max-w-[240px] items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100",
                    )}
                >
                    <span className="truncate">{current.name}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent open={open} className="left-0 right-auto min-w-[260px]">
                {workspaces.map((workspace) => (
                    <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => {
                            dispatch(setCurrentWorkspaceId(workspace.id));
                            setOpen(false);
                        }}
                        className={cn(workspace.id === current.id && "bg-slate-100 font-medium")}
                    >
                        {workspace.name}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                    onClick={() => {
                        setOpen(false);
                        navigate("/app/workspaces");
                    }}
                >
                    Manage workspaces
                </DropdownMenuItem>
                <div className="px-2 py-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-0 text-slate-600"
                        onClick={() => {
                            setOpen(false);
                            navigate(`/app/workspaces/${current.id}/settings`);
                        }}
                    >
                        Workspace settings
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
