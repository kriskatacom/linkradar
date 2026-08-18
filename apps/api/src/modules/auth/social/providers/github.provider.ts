import { asString, getJson } from "./provider-http.js";
import type { SocialProfile } from "../social-auth.types.js";

export async function fetchGitHubProfile(accessToken: string): Promise<SocialProfile> {
    const user = await getJson("https://api.github.com/user", accessToken, {
        accept: "application/vnd.github+json",
    });
    let email = asString(user.email)?.toLowerCase() ?? null;
    let emailVerified = false;

    if (!email) {
        const emailsResponse = await fetch("https://api.github.com/user/emails", {
            headers: {
                accept: "application/vnd.github+json",
                authorization: `Bearer ${accessToken}`,
            },
        });

        if (emailsResponse.ok) {
            const emails = (await emailsResponse.json()) as Array<{
                email?: string;
                primary?: boolean;
                verified?: boolean;
            }>;
            const chosen =
                emails.find((item) => item.primary && item.verified && item.email) ??
                emails.find((item) => item.verified && item.email);
            email = asString(chosen?.email)?.toLowerCase() ?? null;
            emailVerified = Boolean(chosen?.verified);
        }
    } else {
        emailVerified = true;
    }

    return {
        provider: "github",
        providerUserId: String(user.id ?? ""),
        email,
        name: asString(user.name) ?? asString(user.login) ?? (email ? email.split("@")[0] : "User"),
        emailVerified,
    };
}
