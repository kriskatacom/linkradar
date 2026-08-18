export type UserRole = "admin" | "user" | string;
export type PermissionName = string;

export type AuthUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    theme: "light" | "dark" | "system";
    roles: UserRole[];
    permissions: PermissionName[];
};

export type SuccessResponse<T> = {
    success: true;
    data: T;
};

export type ErrorResponse = {
    success: false;
    error: {
        code: string;
        message: string;
        fields?: Record<string, string[]>;
    };
};

export type AuthResponseData = {
    user: AuthUser;
    accessToken: string;
};

export type RegisterInput = {
    name: string;
    email: string;
    password: string;
};

export type LoginInput = {
    email: string;
    password: string;
};
