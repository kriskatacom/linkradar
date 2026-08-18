import { db, userSocialAccounts, users } from "@link-radar/database";
import { and, eq } from "drizzle-orm";

import { emailAlreadyExistsError } from "../auth.errors.js";
import type { NewUserRow, UserRow } from "../auth.types.js";
import { insertPersonalWorkspaceTx } from "../../workspaces/workspace.provision.js";
import {
    DuplicateSocialIdentityError,
    type NewUserSocialAccountRow,
    type SocialAuthRepository,
    type UserSocialAccountRow,
} from "./social-auth.repository.js";
import type { SocialProvider } from "./social-auth.types.js";

function isDuplicateEntry(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "errno" in error &&
        (error as { errno: number }).errno === 1062
    );
}

export class DrizzleSocialAuthRepository implements SocialAuthRepository {
    async findByProviderIdentity(
        provider: SocialProvider,
        providerUserId: string,
    ): Promise<UserSocialAccountRow | null> {
        const rows = await db
            .select()
            .from(userSocialAccounts)
            .where(
                and(
                    eq(userSocialAccounts.provider, provider),
                    eq(userSocialAccounts.providerUserId, providerUserId),
                ),
            )
            .limit(1);

        return rows[0] ?? null;
    }

    async createUserAndSocialAccount(
        user: NewUserRow,
        socialAccount: NewUserSocialAccountRow,
    ): Promise<{ user: UserRow; socialAccount: UserSocialAccountRow }> {
        try {
            await db.transaction(async (tx) => {
                await tx.insert(users).values(user);
                await tx.insert(userSocialAccounts).values({
                    ...socialAccount,
                    userId: user.id,
                });
                await insertPersonalWorkspaceTx(tx, { id: user.id, name: user.name });
            });
        } catch (error) {
            if (isDuplicateEntry(error)) {
                const existingSocial = await this.findByProviderIdentity(
                    socialAccount.provider as SocialProvider,
                    socialAccount.providerUserId,
                );

                if (existingSocial) {
                    throw new DuplicateSocialIdentityError();
                }

                throw emailAlreadyExistsError();
            }

            throw error;
        }

        const [createdUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        const [createdSocial] = await db
            .select()
            .from(userSocialAccounts)
            .where(eq(userSocialAccounts.id, socialAccount.id))
            .limit(1);

        if (!createdUser || !createdSocial) {
            throw new Error("Failed to load created social user.");
        }

        return { user: createdUser, socialAccount: createdSocial };
    }
}
