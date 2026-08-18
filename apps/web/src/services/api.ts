import { Mutex } from "async-mutex";
import {
    createApi,
    fetchBaseQuery,
    type BaseQueryFn,
    type FetchArgs,
    type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

import { authSucceeded, clearAuth } from "@/features/auth/authSlice";
import type { SuccessResponse } from "@/features/auth/types";
import type { AuthResponseData } from "@/features/auth/types";
import type { RootState } from "@/app/store";

const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    credentials: "include",
    prepareHeaders: (headers, api) => {
        const state = api.getState() as RootState;
        const accessToken = state.auth.accessToken;

        if (accessToken) {
            headers.set("authorization", `Bearer ${accessToken}`);
        }

        return headers;
    },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions,
) => {
    await mutex.waitForUnlock();
    let result = await rawBaseQuery(args, api, extraOptions);

    const status = result.error?.status;
    const isRefreshCall =
        typeof args === "string"
            ? args.includes("/api/auth/refresh")
            : String(args.url).includes("/api/auth/refresh");

    if (status === 401 && !isRefreshCall) {
        if (!mutex.isLocked()) {
            const release = await mutex.acquire();
            try {
                const refreshResult = await rawBaseQuery(
                    {
                        url: "/api/auth/refresh",
                        method: "POST",
                    },
                    api,
                    extraOptions,
                );

                if (refreshResult.data) {
                    const refreshData = refreshResult.data as SuccessResponse<AuthResponseData>;
                    api.dispatch(
                        authSucceeded({
                            user: refreshData.data.user,
                            accessToken: refreshData.data.accessToken,
                        }),
                    );
                    result = await rawBaseQuery(args, api, extraOptions);
                } else {
                    api.dispatch(clearAuth());
                }
            } finally {
                release();
            }
        } else {
            await mutex.waitForUnlock();
            result = await rawBaseQuery(args, api, extraOptions);
        }
    }

    return result;
};

export const api = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithReauth,
    endpoints: () => ({}),
});
