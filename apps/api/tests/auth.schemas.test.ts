import { describe, expect, it } from "vitest";

import { loginBodySchema, registerBodySchema } from "../src/modules/auth/auth.schemas.js";

describe("registerBodySchema", () => {
    it("accepts a valid payload and lowercases email", () => {
        const parsed = registerBodySchema.parse({
            name: "  Kristian  ",
            email: "  User@Example.com ",
            password: "StrongPassword123",
        });

        expect(parsed).toEqual({
            name: "Kristian",
            email: "user@example.com",
            password: "StrongPassword123",
        });
    });

    it("rejects an invalid email", () => {
        const parsed = registerBodySchema.safeParse({
            name: "Kristian",
            email: "not-an-email",
            password: "StrongPassword123",
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.error.flatten().fieldErrors.email).toBeDefined();
        }
    });

    it("rejects a short password", () => {
        const parsed = registerBodySchema.safeParse({
            name: "Kristian",
            email: "user@example.com",
            password: "short",
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.error.flatten().fieldErrors.password?.[0]).toContain("8");
        }
    });
});

describe("loginBodySchema", () => {
    it("lowercases email", () => {
        const parsed = loginBodySchema.parse({
            email: "User@Example.com",
            password: "secret",
        });

        expect(parsed.email).toBe("user@example.com");
    });
});
