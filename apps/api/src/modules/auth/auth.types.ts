import type { authSessions, users } from "@link-radar/database";

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type AuthSessionRow = typeof authSessions.$inferSelect;
export type NewAuthSessionRow = typeof authSessions.$inferInsert;

export type AuthenticatedUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
};

export type AccessTokenPayload = {
    sub: string;
    sessionId: string;
};

export type AuthTokensResult = {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken: string;
};

export type RequestContext = {
    userAgent: string | null;
    ipAddress: string | null;
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

export function toAuthenticatedUser(user: UserRow): AuthenticatedUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerifiedAt !== null,
    };
}
