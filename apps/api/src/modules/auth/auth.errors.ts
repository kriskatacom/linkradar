export class AuthError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly fields?: Record<string, string[]>;

    constructor(
        code: string,
        message: string,
        statusCode: number,
        fields?: Record<string, string[]>,
    ) {
        super(message);
        this.name = "AuthError";
        this.code = code;
        this.statusCode = statusCode;
        this.fields = fields;
    }
}

export function invalidCredentialsError(): AuthError {
    return new AuthError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
}

export function emailAlreadyExistsError(): AuthError {
    return new AuthError("EMAIL_ALREADY_EXISTS", "An account with this email already exists.", 409);
}

export function accountDisabledError(): AuthError {
    return new AuthError("ACCOUNT_DISABLED", "This account is disabled.", 403);
}

export function unauthenticatedError(): AuthError {
    return new AuthError("UNAUTHENTICATED", "Authentication required.", 401);
}

export function invalidRefreshTokenError(): AuthError {
    return new AuthError("INVALID_REFRESH_TOKEN", "Invalid or expired refresh token.", 401);
}

export function validationError(fields: Record<string, string[]>): AuthError {
    return new AuthError("VALIDATION_ERROR", "Validation failed.", 422, fields);
}
