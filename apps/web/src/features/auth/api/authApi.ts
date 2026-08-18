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
} = authApi;
