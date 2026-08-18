import { asBoolean, asString, getJson } from "./provider-http.js";
import type { SocialProfile } from "../social-auth.types.js";

export async function fetchLinkedInProfile(accessToken: string): Promise<SocialProfile> {
    const payload = await getJson("https://api.linkedin.com/v2/userinfo", accessToken);
    const email = asString(payload.email)?.toLowerCase() ?? null;
    const fullName = [asString(payload.given_name), asString(payload.family_name)]
        .filter(Boolean)
        .join(" ");
    const name =
        asString(payload.name) ??
        (fullName.length > 0 ? fullName : null) ??
        (email ? email.split("@")[0] : "User");

    return {
        provider: "linkedin",
        providerUserId: asString(payload.sub) ?? "",
        email,
        name,
        emailVerified: asBoolean(payload.email_verified),
    };
}
