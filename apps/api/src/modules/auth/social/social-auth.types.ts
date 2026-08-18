export const SOCIAL_PROVIDERS = ["google", "facebook", "linkedin", "github"] as const;

export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number];

export function isSocialProvider(value: string): value is SocialProvider {
    return (SOCIAL_PROVIDERS as readonly string[]).includes(value);
}

export type SocialProfile = {
    provider: SocialProvider;
    providerUserId: string;
    email: string | null;
    name: string;
    emailVerified: boolean;
};

export type SocialOAuthAdapter = {
    isConfigured(provider: SocialProvider): boolean;
    createAuthorizationUrl(
        provider: SocialProvider,
        request: unknown,
        reply: unknown,
    ): Promise<string>;
    exchangeAuthorizationCode(
        provider: SocialProvider,
        request: unknown,
        reply: unknown,
    ): Promise<string>;
};

export type SocialProfileFetcher = {
    fetchProfile(provider: SocialProvider, accessToken: string): Promise<SocialProfile>;
};
