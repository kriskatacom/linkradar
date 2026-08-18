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
    }),
});

export const {
    useRegisterMutation,
    useLoginMutation,
    useRefreshMutation,
    useLogoutMutation,
    useMeQuery,
    useLazyMeQuery,
} = authApi;
