import { asBoolean, asString, getJson } from "./provider-http.js";
import type { SocialProfile } from "../social-auth.types.js";

export async function fetchGoogleProfile(accessToken: string): Promise<SocialProfile> {
    const payload = await getJson("https://openidconnect.googleapis.com/v1/userinfo", accessToken);
    const email = asString(payload.email)?.toLowerCase() ?? null;

    return {
        provider: "google",
        providerUserId: asString(payload.sub) ?? "",
        email,
        name:
            asString(payload.name) ??
            asString(payload.given_name) ??
            (email ? email.split("@")[0] : "User"),
        emailVerified: asBoolean(payload.email_verified),
    };
}
