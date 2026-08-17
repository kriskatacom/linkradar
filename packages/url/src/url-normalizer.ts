export class UrlNormalizer {
    public normalize(input: string, baseUrl?: string): string {
        const url = baseUrl ? new URL(input, baseUrl) : new URL(input);

        url.hash = "";

        return url.toString();
    }
}
