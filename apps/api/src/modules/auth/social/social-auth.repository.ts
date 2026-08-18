import type { userSocialAccounts } from "@link-radar/database";

import type { NewUserRow, UserRow } from "../auth.types.js";
import type { SocialProvider } from "./social-auth.types.js";

export type UserSocialAccountRow = typeof userSocialAccounts.$inferSelect;
export type NewUserSocialAccountRow = typeof userSocialAccounts.$inferInsert;

export class DuplicateSocialIdentityError extends Error {
    constructor() {
        super("Duplicate social identity.");
        this.name = "DuplicateSocialIdentityError";
    }
}

export interface SocialAuthRepository {
    findByProviderIdentity(
        provider: SocialProvider,
        providerUserId: string,
    ): Promise<UserSocialAccountRow | null>;
    createUserAndSocialAccount(
        user: NewUserRow,
        socialAccount: NewUserSocialAccountRow,
    ): Promise<{ user: UserRow; socialAccount: UserSocialAccountRow }>;
}
