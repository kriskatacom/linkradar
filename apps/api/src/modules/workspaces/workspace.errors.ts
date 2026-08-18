import { AuthError } from "../auth/auth.errors.js";

export function workspaceNotFoundError(): AuthError {
    return new AuthError("NOT_FOUND", "Workspace was not found.", 404);
}

export function siteNotFoundError(): AuthError {
    return new AuthError("NOT_FOUND", "Site was not found.", 404);
}

export function workspaceAccessDeniedError(): AuthError {
    return new AuthError("FORBIDDEN", "You do not have access to this workspace.", 403);
}

export function workspaceRoleDeniedError(): AuthError {
    return new AuthError(
        "FORBIDDEN",
        "You do not have permission to perform this action in this workspace.",
        403,
    );
}

export function duplicateSiteError(): AuthError {
    return new AuthError("VALIDATION_ERROR", "Validation failed.", 422, {
        url: ["A site with this URL already exists in the workspace."],
    });
}

export function invalidSiteUrlError(message = "Enter a valid http or https URL."): AuthError {
    return new AuthError("VALIDATION_ERROR", "Validation failed.", 422, {
        url: [message],
    });
}
