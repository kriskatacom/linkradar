import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";

import { Toaster } from "@/components/ui/sonner";
import { AuthBootstrap } from "./bootstrap-auth";
import { router } from "./router";
import { store } from "./store";

export function AppProviders({ children }: { children?: ReactNode }) {
    return (
        <Provider store={store}>
            <AuthBootstrap>
                {children}
                <RouterProvider router={router} />
                <Toaster />
            </AuthBootstrap>
        </Provider>
    );
}
