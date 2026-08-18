import { describe, expect, it } from "vitest";

import { UrlNormalizer } from "../src/url-normalizer.js";

describe("UrlNormalizer", () => {
    const normalizer = new UrlNormalizer();

    it("resolves relative URLs", () => {
        const result = normalizer.normalize("/products", "https://example.com");

        expect(result).toBe("https://example.com/products");
    });

    it("removes URL fragments", () => {
        const result = normalizer.normalize("https://example.com/products#details");

        expect(result).toBe("https://example.com/products");
    });
});
