import { DrizzleWorkspaceRepository } from "../modules/workspaces/workspace.repository.drizzle.js";

const created = await new DrizzleWorkspaceRepository().backfillPersonalWorkspaces();
console.log(`Created ${created} personal workspace(s) for users without membership.`);
process.exit(0);
