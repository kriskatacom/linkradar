export class UrlNormalizer {
    normalize(input, baseUrl) {
        const url = baseUrl ? new URL(input, baseUrl) : new URL(input);
        url.hash = "";
        return url.toString();
    }
}
