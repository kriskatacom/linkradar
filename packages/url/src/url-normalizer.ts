export class UrlNormalizer {
    public normalize(input: string, baseUrl?: string): string {
        const url = baseUrl ? new URL(input, baseUrl) : new URL(input);

        url.hash = "";

        return url.toString();
    }

    public normalizeSiteUrl(input: string): string {
        const url = new URL(input.trim());

        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Only http and https URLs are supported.");
        }

        url.hash = "";
        url.search = "";
        url.hostname = url.hostname.toLowerCase();

        if (
            (url.protocol === "http:" && url.port === "80") ||
            (url.protocol === "https:" && url.port === "443")
        ) {
            url.port = "";
        }

        return url.toString();
    }
}
