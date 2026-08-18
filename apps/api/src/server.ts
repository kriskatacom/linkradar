import { checkDatabaseConnection } from "@link-radar/database";

import { buildApp } from "./app.js";
import { getApiEnv, isHttpsUrl } from "./config/env.js";
import { DrizzleAuthRepository } from "./modules/auth/auth.repository.drizzle.js";

const env = getApiEnv();
const app = await buildApp();

await checkDatabaseConnection();

if (isHttpsUrl(env.frontendUrl) && (env.cookieSameSite === "lax" || !env.cookieSecure)) {
    app.log.warn(
        "HTTPS frontend with SameSite=lax or Secure=false will drop the refresh cookie on cross-origin requests. For https://website.local + https://api.local set AUTH_COOKIE_SAMESITE=none and AUTH_COOKIE_SECURE=true.",
    );
}

if (env.isDevelopment) {
    const deleted = await new DrizzleAuthRepository().deleteExpiredSessions();
    app.log.info({ deleted }, "Deleted expired auth sessions");

    const { DrizzleWorkspaceRepository } =
        await import("./modules/workspaces/workspace.repository.drizzle.js");
    const backfilled = await new DrizzleWorkspaceRepository().backfillPersonalWorkspaces();
    app.log.info({ backfilled }, "Ensured personal workspaces for existing users");
}

await app.listen({
    host: env.host,
    port: env.port,
});
