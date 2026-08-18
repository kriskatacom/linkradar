import { Toaster as SonnerToaster } from "sonner";

import { useAppSelector } from "@/hooks/redux";

export function Toaster() {
    const theme = useAppSelector((state) => state.theme.preference);

    return <SonnerToaster theme={theme} richColors position="top-right" />;
}
