export type AuthUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
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
