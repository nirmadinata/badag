import { schema } from "@badag/db-schema/main-db";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

// D1-backed Drizzle client for the main database. Server-only.
export const db = drizzle(env.MAIN_DB, { schema });
