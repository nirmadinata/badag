import { schema as mainSchema } from "@badag/db-schema/main-db";
import { schema as orchestratorSchema } from "@badag/db-schema/orchestrator-db";
import { drizzle } from "drizzle-orm/d1";
import { drizzle as durableDrizzle } from "drizzle-orm/durable-sqlite";

export function getMainDB(db: D1Database) {
    return drizzle(db, { schema: mainSchema });
}

export function getTaskOrchestratorDB(db: DurableObjectStorage) {
    return durableDrizzle(db, { schema: orchestratorSchema });
}

export async function migrateMainDB(db: D1Database) {
    const { migrate } = await import("drizzle-orm/d1/migrator");

    // @ts-expect-error not typesafe
    const migrations = await import("../migrations/main-db/migrations");
    await migrate(getMainDB(db), migrations);
}

export async function migrateTaskOrchestratorDB(db: DurableObjectStorage) {
    const { migrate } = await import("drizzle-orm/durable-sqlite/migrator");

    // @ts-expect-error not typesafe
    const migrations = await import("../migrations/orchestrator-db/migrations");
    await migrate(getTaskOrchestratorDB(db), migrations);
}
