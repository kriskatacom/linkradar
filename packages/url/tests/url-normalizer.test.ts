import { describe, expect, it } from "vitest";

import { UrlNormalizer } from "../src/url-normalizer.js";

describe("UrlNormalizer", () => {
    const normalizer = new UrlNormalizer();

    it("resolves relative URLs", () => {
        const result = normalizer.normalize("/products", "https://example.com");

        expect(result).toBe("https://example.com/products");
    });

    it("treats origin URLs with and without a trailing slash as the same site", () => {
        expect(normalizer.normalizeSiteUrl("https://example.com")).toBe(
            normalizer.normalizeSiteUrl("https://example.com/"),
        );
        expect(normalizer.normalizeSiteUrl("https://example.com/")).toBe("https://example.com/");
    });

    it("lowercases the hostname and removes fragments and query strings", () => {
        expect(normalizer.normalizeSiteUrl("HTTPS://Example.COM/path?q=1#hash")).toBe(
            "https://example.com/path",
        );
    });
});
