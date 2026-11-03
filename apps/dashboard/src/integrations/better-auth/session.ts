import { schema } from "@badag/db-schema/main-db";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { count } from "drizzle-orm";

import { db } from "@/integrations/db/client";

import { auth } from "./server";

// Session/user state used by route guards. Kept as one round trip so each
// navigation knows both whether a user is signed in and whether setup is done.
export const getAuthState = createServerFn({ method: "GET" }).handler(
    async () => {
        const session = await auth.api.getSession({
            headers: getRequestHeaders(),
        });

        if (session) {
            return { setupRequired: false, user: session.user };
        }

        const [row] = await db.select({ total: count() }).from(schema.user);

        return { setupRequired: (row?.total ?? 0) === 0, user: null };
    }
);

export const listUsers = createServerFn({ method: "GET" }).handler(async () => {
    const result = await auth.api.listUsers({
        headers: getRequestHeaders(),
        query: { limit: 100, sortBy: "createdAt", sortDirection: "desc" },
    });

    return result.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned ?? false,
        createdAt: user.createdAt.toISOString(),
    }));
});
