import { describe, expect, it } from "vitest";

import { resolveApiBaseUrl } from "@/lib/api-base-url";

describe("resolveApiBaseUrl", () => {
    it("uses same-origin /api when VITE_API_URL is empty", () => {
        expect(resolveApiBaseUrl(undefined)).toBe("");
        expect(resolveApiBaseUrl("")).toBe("");
        expect(resolveApiBaseUrl("/")).toBe("");
        expect(resolveApiBaseUrl("   ")).toBe("");
    });

    it("keeps an explicit API origin without a trailing slash", () => {
        expect(resolveApiBaseUrl("https://api.local/")).toBe("https://api.local");
        expect(resolveApiBaseUrl("http://localhost:3000")).toBe("http://localhost:3000");
    });
});
