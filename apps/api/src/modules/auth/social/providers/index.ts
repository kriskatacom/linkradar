import { fetchFacebookProfile } from "./facebook.provider.js";
import { fetchGitHubProfile } from "./github.provider.js";
import { fetchGoogleProfile } from "./google.provider.js";
import { fetchLinkedInProfile } from "./linkedin.provider.js";
import type { SocialProfile, SocialProfileFetcher, SocialProvider } from "../social-auth.types.js";

export class HttpSocialProfileFetcher implements SocialProfileFetcher {
    async fetchProfile(provider: SocialProvider, accessToken: string): Promise<SocialProfile> {
        const profile = await fetchProviderProfile(provider, accessToken);

        if (!profile.providerUserId) {
            throw new Error(`Social provider ${provider} did not return a user id.`);
        }

        return profile;
    }
}

async function fetchProviderProfile(
    provider: SocialProvider,
    accessToken: string,
): Promise<SocialProfile> {
    switch (provider) {
        case "google":
            return fetchGoogleProfile(accessToken);
        case "facebook":
            return fetchFacebookProfile(accessToken);
        case "linkedin":
            return fetchLinkedInProfile(accessToken);
        case "github":
            return fetchGitHubProfile(accessToken);
    }
}
