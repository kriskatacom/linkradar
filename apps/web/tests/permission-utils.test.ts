import { describe, expect, it } from "vitest";

import { hasAnyPermission, hasPermission } from "@/features/auth/permission-utils";

const user = {
    id: "u1",
    name: "Kristian",
    email: "user@example.com",
    emailVerified: true,
    theme: "system" as const,
    roles: ["user"],
    permissions: ["sites.view", "reports.export"],
};

describe("permission utils", () => {
    it("hasPermission returns true when permission exists", () => {
        expect(hasPermission(user, "sites.view")).toBe(true);
    });

    it("hasPermission returns false when permission is missing", () => {
        expect(hasPermission(user, "users.update")).toBe(false);
    });

    it("hasAnyPermission returns true when at least one exists", () => {
        expect(hasAnyPermission(user, ["users.update", "reports.export"])).toBe(true);
    });

    it("hasAnyPermission returns false when none exist", () => {
        expect(hasAnyPermission(user, ["users.update", "settings.update"])).toBe(false);
    });
});
