import { configureStore } from "@reduxjs/toolkit";

import { authReducer } from "@/features/auth/authSlice";
import { workspaceReducer } from "@/features/workspaces/workspaceSlice";
import { api } from "@/services/api";
import "@/features/admin/api/adminApi";
import "@/features/auth/api/authApi";
import "@/features/workspaces/api/workspaceApi";

export const store = configureStore({
    reducer: {
        auth: authReducer,
        workspace: workspaceReducer,
        [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
