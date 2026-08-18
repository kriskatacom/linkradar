import { db, workspaceMembers, workspaces } from "@link-radar/database";
import { eq } from "drizzle-orm";

import { buildPersonalWorkspace } from "./personal-workspace.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function insertPersonalWorkspaceTx(
    tx: Tx,
    user: { id: string; name: string },
): Promise<void> {
    const existing = await tx
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, user.id))
        .limit(1);

    if (existing.length > 0) {
        return;
    }

    const slugs = await tx.select({ slug: workspaces.slug }).from(workspaces);
    const workspace = buildPersonalWorkspace(
        user,
        slugs.map((row) => row.slug),
    );

    await tx.insert(workspaces).values({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        ownerUserId: workspace.ownerUserId,
    });
    await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: user.id,
        role: "owner",
    });
}
