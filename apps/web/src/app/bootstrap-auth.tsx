import { useEffect } from "react";

import { authApi } from "@/features/auth/api/authApi";
import { clearAuth, setInitialized } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const initialized = useAppSelector((state) => state.auth.initialized);

    useEffect(() => {
        if (initialized) {
            return;
        }

        let isMounted = true;

        const runBootstrap = async () => {
            try {
                await dispatch(authApi.endpoints.refresh.initiate()).unwrap();
                await dispatch(authApi.endpoints.me.initiate()).unwrap();
            } catch {
                dispatch(clearAuth());
            } finally {
                if (isMounted) {
                    dispatch(setInitialized(true));
                }
            }
        };

        void runBootstrap();

        return () => {
            isMounted = false;
        };
    }, [dispatch, initialized]);

    if (!initialized) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-sm text-slate-600">Initializing LinkRadar...</div>
            </div>
        );
    }

    return <>{children}</>;
}
