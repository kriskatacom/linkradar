import { UrlNormalizer } from "@link-radar/url";

const normalizer = new UrlNormalizer();

const url = normalizer.normalize(
    "/products#details",
    "https://example.com"
);

console.log(url);