import { api } from "@/services/api";
import { authSucceeded, clearAuth, setUser } from "../authSlice";
import type {
    AuthResponseData,
    AuthUser,
    LoginInput,
    RegisterInput,
    SuccessResponse,
} from "../types";

type LogoutResponse = SuccessResponse<{ loggedOut: true }>;
type MeResponse = SuccessResponse<{ user: AuthUser }>;
type ThemePreference = AuthUser["theme"];

export const authApi = api.injectEndpoints({
    endpoints: (builder) => ({
        register: builder.mutation<SuccessResponse<AuthResponseData>, RegisterInput>({
            query: (body) => ({
                url: "/api/auth/register",
                method: "POST",
                body,
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const { data } = await queryFulfilled;
                dispatch(authSucceeded(data.data));
            },
        }),
        login: builder.mutation<SuccessResponse<AuthResponseData>, LoginInput>({
            query: (body) => ({
                url: "/api/auth/login",
                method: "POST",
                body,
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const { data } = await queryFulfilled;
                dispatch(authSucceeded(data.data));
            },
        }),
        refresh: builder.mutation<SuccessResponse<AuthResponseData>, void>({
            query: () => ({
                url: "/api/auth/refresh",
                method: "POST",
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const { data } = await queryFulfilled;
                dispatch(authSucceeded(data.data));
            },
        }),
        logout: builder.mutation<LogoutResponse, void>({
            query: () => ({
                url: "/api/auth/logout",
                method: "POST",
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                await queryFulfilled;
                dispatch(clearAuth());
            },
        }),
        me: builder.query<MeResponse, void>({
            query: () => "/api/auth/me",
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const { data } = await queryFulfilled;
                dispatch(setUser(data.data.user));
            },
        }),
        updateTheme: builder.mutation<MeResponse, { theme: ThemePreference }>({
            query: (body) => ({
                url: "/api/auth/me",
                method: "PATCH",
                body,
            }),
            async onQueryStarted(body, { dispatch, getState, queryFulfilled }) {
                const previous = (getState() as unknown as { auth: { user: AuthUser | null } }).auth
                    .user;
                if (previous) {
                    dispatch(setUser({ ...previous, theme: body.theme }));
                }

                try {
                    const { data } = await queryFulfilled;
                    dispatch(setUser(data.data.user));
                } catch {
                    if (previous) {
                        dispatch(setUser(previous));
                    }
                }
            },
        }),
        requestEmailVerification: builder.mutation<
            SuccessResponse<{ message: string }>,
            { email?: string } | void
        >({
            query: (body) => ({
                url: "/api/auth/email/verification/request",
                method: "POST",
                body: body ?? {},
            }),
        }),
        verifyEmail: builder.mutation<MeResponse, { token: string }>({
            query: (body) => ({
                url: "/api/auth/email/verification/verify",
                method: "POST",
                body,
            }),
            async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
                const { data } = await queryFulfilled;
                const previous = (
                    getState() as unknown as {
                        auth: { user: AuthUser | null; accessToken: string | null };
                    }
                ).auth;
                if (previous.user && previous.accessToken) {
                    dispatch(setUser(data.data.user));
                }
            },
        }),
        forgotPassword: builder.mutation<SuccessResponse<{ message: string }>, { email: string }>({
            query: (body) => ({
                url: "/api/auth/forgot-password",
                method: "POST",
                body,
            }),
        }),
        resetPassword: builder.mutation<
            SuccessResponse<{ message: string }>,
            { token: string; password: string }
        >({
            query: (body) => ({
                url: "/api/auth/reset-password",
                method: "POST",
                body,
            }),
        }),
    }),
});

export const {
    useRegisterMutation,
    useLoginMutation,
    useRefreshMutation,
    useLogoutMutation,
    useMeQuery,
    useLazyMeQuery,
    useUpdateThemeMutation,
    useRequestEmailVerificationMutation,
    useVerifyEmailMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
} = authApi;
