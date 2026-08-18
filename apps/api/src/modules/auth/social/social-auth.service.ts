import { randomUUID } from "node:crypto";

import {
    AuthError,
    accountDisabledError,
    socialAccountLinkRequiredError,
    socialEmailRequiredError,
    unauthenticatedError,
} from "../auth.errors.js";
import type { AuthRepository } from "../auth.repository.js";
import type { AuthService } from "../auth.service.js";
import type { AuthTokensResult, RequestContext, UserRow } from "../auth.types.js";
import {
    DuplicateSocialIdentityError,
    type SocialAuthRepository,
} from "./social-auth.repository.js";
import type { SocialProfile } from "./social-auth.types.js";

export class SocialAuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly socialRepository: SocialAuthRepository,
        private readonly authService: AuthService,
    ) {}

    async loginWithProfile(
        profile: SocialProfile,
        context: RequestContext,
    ): Promise<AuthTokensResult> {
        if (!profile.providerUserId) {
            throw unauthenticatedError();
        }

        const existingSocial = await this.socialRepository.findByProviderIdentity(
            profile.provider,
            profile.providerUserId,
        );

        if (existingSocial) {
            return this.loginExistingSocialUser(existingSocial.userId, context);
        }

        const email = profile.email?.trim().toLowerCase() ?? null;

        if (!email) {
            throw socialEmailRequiredError();
        }

        const existingUser = await this.authRepository.findUserByEmail(email);

        if (existingUser) {
            throw socialAccountLinkRequiredError();
        }

        const userId = randomUUID();

        try {
            const created = await this.socialRepository.createUserAndSocialAccount(
                {
                    id: userId,
                    name: profile.name.slice(0, 150) || "User",
                    email,
                    passwordHash: null,
                    emailVerifiedAt: profile.emailVerified ? new Date() : null,
                    isActive: true,
                    deletedAt: null,
                },
                {
                    id: randomUUID(),
                    userId,
                    provider: profile.provider,
                    providerUserId: profile.providerUserId,
                    providerEmail: email,
                },
            );
            await this.authRepository.ensureSystemRoles();
            await this.authRepository.assignRoleToUser(created.user.id, "user");

            return this.authService.createSessionForUser(created.user, context);
        } catch (error) {
            if (error instanceof DuplicateSocialIdentityError) {
                const raced = await this.socialRepository.findByProviderIdentity(
                    profile.provider,
                    profile.providerUserId,
                );

                if (raced) {
                    return this.loginExistingSocialUser(raced.userId, context);
                }
            }

            if (error instanceof AuthError && error.code === "EMAIL_ALREADY_EXISTS") {
                throw socialAccountLinkRequiredError();
            }

            throw error;
        }
    }

    private async loginExistingSocialUser(
        userId: string,
        context: RequestContext,
    ): Promise<AuthTokensResult> {
        const user = await this.requireSocialUser(userId);
        return this.authService.createSessionForUser(user, context);
    }

    private async requireSocialUser(userId: string): Promise<UserRow> {
        const user = await this.authRepository.findUserById(userId);

        if (!user || user.deletedAt !== null) {
            throw unauthenticatedError();
        }

        if (!user.isActive) {
            throw accountDisabledError();
        }

        return user;
    }
}
