import { schema as orchestratorSchema } from "@badag/db-schema/orchestrator-db";
import { drizzle as durableDrizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import migrations from "../migrations/orchestrator-db/migrations";

export function getTaskOrchestratorDB(db: DurableObjectStorage) {
    return durableDrizzle(db, { schema: orchestratorSchema });
}

export async function migrateTaskOrchestratorDB(db: DurableObjectStorage) {
    await migrate(getTaskOrchestratorDB(db), migrations);
}
