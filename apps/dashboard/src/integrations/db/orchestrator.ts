import { schema as orchestratorSchema } from "@badag/db-schema/orchestrator-db";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

import migrations from "../../../migrations/orchestrator-db/migrations";

// Runs the orchestrator schema migrations inside a Durable Object.
export async function migrateTaskOrchestratorDB(storage: DurableObjectStorage) {
    await migrate(drizzle(storage, { schema: orchestratorSchema }), migrations);
}
