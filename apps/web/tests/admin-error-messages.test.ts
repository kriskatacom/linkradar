import { describe, expect, it } from "vitest";

import { getAdminErrorMessage } from "@/features/admin/admin-error-messages";

describe("getAdminErrorMessage", () => {
    it("maps known admin error codes", () => {
        expect(
            getAdminErrorMessage({
                data: {
                    success: false,
                    error: {
                        code: "LAST_ADMIN_PROTECTED",
                        message: "raw",
                    },
                },
            }),
        ).toContain("last active administrator");
    });
});
