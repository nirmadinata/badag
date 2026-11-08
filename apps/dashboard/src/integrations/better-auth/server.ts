import { schema } from "@badag/db-schema/main-db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { admin } from "better-auth/plugins/admin";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { appenv } from "#/integrations/appenv/index.ts";
import { db } from "@/integrations/db/client";

const SIGN_UP_PATH = "/sign-up/email";
const ADMIN_ROLE = "admin";

export const auth = betterAuth({
    appName: "Badag",
    baseURL: appenv.BETTER_AUTH_URL,
    secret: appenv.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: "sqlite", schema }),
    trustedOrigins: [appenv.BETTER_AUTH_URL],
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        // No email transport is configured yet: surface the reset link in
        // development instead of pretending an email was sent.
        sendResetPassword: async ({ user, url }) => {
            if (!import.meta.env.DEV) {
                throw new APIError("INTERNAL_SERVER_ERROR", {
                    message: "Password reset email is not configured.",
                });
            }

            console.info(`[auth] Password reset for ${user.email}: ${url}`);
        },
    },
    hooks: {
        before: createAuthMiddleware(async (ctx) => {
            // Public sign-up exists only for first-run setup. Afterwards every
            // account is created by an administrator.
            if (ctx.path !== SIGN_UP_PATH) {
                return;
            }

            const users = await ctx.context.adapter.count({ model: "user" });

            if (users > 0) {
                throw new APIError("FORBIDDEN", {
                    message:
                        "Setup is complete. Ask an administrator to create your account.",
                });
            }
        }),
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user, ctx) => {
                    if (!ctx) {
                        return;
                    }

                    const users = await ctx.context.adapter.count({
                        model: "user",
                    });

                    // The first account is the administrator.
                    if (users === 0) {
                        return { data: { ...user, role: ADMIN_ROLE } };
                    }
                },
            },
        },
    },
    session: {
        cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
        storage: "database",
        customRules: {
            "/sign-in/email": { window: 60, max: 10 },
            "/request-password-reset": { window: 60, max: 5 },
        },
    },
    plugins: [
        admin({ defaultRole: "user", adminRoles: [ADMIN_ROLE] }),
        // Must stay last: hands cookie writes to TanStack Start.
        tanstackStartCookies(),
    ],
});
