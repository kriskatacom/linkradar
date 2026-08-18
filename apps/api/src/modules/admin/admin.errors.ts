import { AuthError } from "../auth/auth.errors.js";

export function notFoundError(resource: string): AuthError {
    return new AuthError("NOT_FOUND", `${resource} was not found.`, 404);
}

export function lastAdminProtectedError(): AuthError {
    return new AuthError(
        "LAST_ADMIN_PROTECTED",
        "The last active administrator cannot be removed, disabled, or deleted.",
        409,
    );
}

export function systemRoleProtectedError(): AuthError {
    return new AuthError("SYSTEM_ROLE_PROTECTED", "System roles cannot be deleted or renamed.", 409);
}

export function roleInUseError(): AuthError {
    return new AuthError(
        "ROLE_IN_USE",
        "This role is assigned to users. Reassign them before deleting the role.",
        409,
    );
}

export function adminRolePermissionsReadOnlyError(): AuthError {
    return new AuthError(
        "SYSTEM_ROLE_PROTECTED",
        "Administrator role permissions are managed by the system and cannot be edited.",
        409,
    );
}

export function duplicateRoleNameError(): AuthError {
    return new AuthError("VALIDATION_ERROR", "Validation failed.", 422, {
        name: ["A role with this name already exists."],
    });
}
