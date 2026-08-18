import { randomUUID } from "node:crypto";

export function personalWorkspaceName(userName: string): string {
    const firstName = userName.trim().split(/\s+/)[0] || "User";
    return `${firstName}'s Workspace`;
}

export function slugify(value: string): string {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 160);

    return slug || "workspace";
}

export function uniqueWorkspaceSlug(base: string, existing: Set<string>): string {
    const normalized = slugify(base);
    if (!existing.has(normalized)) {
        return normalized;
    }

    for (let index = 2; index < 1000; index += 1) {
        const candidate = `${normalized}-${index}`.slice(0, 180);
        if (!existing.has(candidate)) {
            return candidate;
        }
    }

    return `${normalized}-${randomUUID().slice(0, 8)}`;
}

export function buildPersonalWorkspace(user: { id: string; name: string }, existingSlugs: string[]) {
    const name = personalWorkspaceName(user.name);
    const slug = uniqueWorkspaceSlug(name, new Set(existingSlugs));

    return {
        id: randomUUID(),
        name,
        slug,
        ownerUserId: user.id,
    };
}
