import { describe, expect, it } from "vitest";

import { hasRole } from "@/features/auth/role-utils";

describe("hasRole", () => {
    it("returns true when role is assigned", () => {
        expect(
            hasRole(
                {
                    id: "u1",
                    name: "Admin",
                    email: "admin@example.com",
                    emailVerified: true,
                    roles: ["admin"],
                },
                "admin",
            ),
        ).toBe(true);
    });

    it("returns false when role is missing", () => {
        expect(
            hasRole(
                {
                    id: "u1",
                    name: "User",
                    email: "user@example.com",
                    emailVerified: true,
                    roles: ["user"],
                },
                "admin",
            ),
        ).toBe(false);
    });
});
