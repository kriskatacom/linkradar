import { describe, expect, it } from "vitest";

import { getApiError } from "@/lib/api-error";

describe("getApiError", () => {
    it("normalizes backend error payload", () => {
        const result = getApiError({
            status: 422,
            data: {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed.",
                    fields: {
                        email: ["Invalid email address."],
                    },
                },
            },
        });

        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.fields?.email).toEqual(["Invalid email address."]);
    });

    it("falls back to generic message", () => {
        const result = getApiError(undefined);
        expect(result.code).toBe("UNKNOWN_ERROR");
    });
});
