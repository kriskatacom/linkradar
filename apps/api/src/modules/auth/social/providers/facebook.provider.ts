import { asString, getJson } from "./provider-http.js";
import type { SocialProfile } from "../social-auth.types.js";

export async function fetchFacebookProfile(accessToken: string): Promise<SocialProfile> {
    const url = new URL("https://graph.facebook.com/me");
    url.searchParams.set("fields", "id,name,email");
    url.searchParams.set("access_token", accessToken);
    const payload = await getJson(url.toString());
    const email = asString(payload.email)?.toLowerCase() ?? null;

    return {
        provider: "facebook",
        providerUserId: asString(payload.id) ?? "",
        email,
        name: asString(payload.name) ?? (email ? email.split("@")[0] : "User"),
        emailVerified: false,
    };
}
