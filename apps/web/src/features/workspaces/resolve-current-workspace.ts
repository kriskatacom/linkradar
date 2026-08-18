export function resolveCurrentWorkspaceId(
    workspaces: Array<{ id: string }>,
    storedId: string | null,
): string | null {
    if (workspaces.length === 0) {
        return null;
    }

    if (workspaces.length === 1) {
        return workspaces[0].id;
    }

    if (storedId && workspaces.some((workspace) => workspace.id === storedId)) {
        return storedId;
    }

    return workspaces[0].id;
}
