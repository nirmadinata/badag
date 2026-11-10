// Better Auth tables. Exported names are the model names the Drizzle adapter
// resolves (`user`, `session`, `account`, `verification`, `rateLimit`), so they
// must not be renamed. Columns follow the schema Better Auth 1.7 generates for
// SQLite, plus the admin plugin fields (`role`, `banned`, ...).

import { relations } from "drizzle-orm";
import {
    index,
    int,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { COMMON_COLUMNS } from "../utils";
import { DEFAULT_USER_ROLE, LIST_USER_ROLE } from "./constants";

export const user = sqliteTable(
    "user",
    {
        id: text("id").primaryKey(),
        name: text("name").notNull(),
        email: text("email").notNull(),
        emailVerified: int("email_verified", { mode: "boolean" })
            .notNull()
            .default(false),
        image: text("image"),

        // Admin plugin: authorization role and ban state.
        role: text("role", { enum: LIST_USER_ROLE })
            .notNull()
            .default(DEFAULT_USER_ROLE),
        banned: int("banned", { mode: "boolean" }).notNull().default(false),
        banReason: text("ban_reason"),
        banExpires: int("ban_expires", { mode: "timestamp_ms" }),

        ...COMMON_COLUMNS,
    },
    (t) => [
        uniqueIndex("user_email_idx").on(t.email),
        index("user_role_idx").on(t.role),
    ]
);

export const session = sqliteTable(
    "session",
    {
        id: text("id").primaryKey(),
        token: text("token").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        expiresAt: int("expires_at", { mode: "timestamp_ms" }).notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),

        // Admin plugin: set when an administrator impersonates the user.
        impersonatedBy: text("impersonated_by"),

        ...COMMON_COLUMNS,
    },
    (t) => [
        uniqueIndex("session_token_idx").on(t.token),
        index("session_user_id_idx").on(t.userId),
    ]
);

export const account = sqliteTable(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: int("access_token_expires_at", {
            mode: "timestamp_ms",
        }),
        refreshTokenExpiresAt: int("refresh_token_expires_at", {
            mode: "timestamp_ms",
        }),
        scope: text("scope"),
        // Hashed password for the `credential` provider.
        password: text("password"),

        ...COMMON_COLUMNS,
    },
    (t) => [
        index("account_user_id_idx").on(t.userId),
        uniqueIndex("account_provider_account_idx").on(
            t.providerId,
            t.accountId
        ),
    ]
);

export const verification = sqliteTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: int("expires_at", { mode: "timestamp_ms" }).notNull(),

        ...COMMON_COLUMNS,
    },
    (t) => [index("verification_identifier_idx").on(t.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

// Better Auth database-backed rate limiting (used in production).
export const rateLimit = sqliteTable(
    "rate_limit",
    {
        id: text("id").primaryKey(),
        key: text("key").notNull(),
        count: int("count").notNull(),
        lastRequest: int("last_request").notNull(),
    },
    (t) => [uniqueIndex("rate_limit_key_idx").on(t.key)]
);
