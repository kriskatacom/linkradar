import { getApiError } from "@/lib/api-error";

const messages: Record<string, string> = {
    LAST_ADMIN_PROTECTED:
        "The last active administrator cannot be removed, disabled, or deleted.",
    SYSTEM_ROLE_PROTECTED: "System roles are protected and cannot be changed this way.",
    ROLE_IN_USE: "This role is assigned to users. Reassign them before deleting it.",
    FORBIDDEN: "You do not have permission to perform this action.",
    VALIDATION_ERROR: "Please check the form and try again.",
    NOT_FOUND: "The requested resource was not found.",
};

export function getAdminErrorMessage(error: unknown): string {
    const apiError = getApiError(error);
    return messages[apiError.code] ?? apiError.message;
}
