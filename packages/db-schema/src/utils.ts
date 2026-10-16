// `unixepoch()` yields seconds; these columns store milliseconds. The SQL
// default keeps raw inserts (SQL console, D1 import, fixtures) consistent with
// the Drizzle path, where `$defaultFn` fills the value in memory so callers see

import { sql } from "drizzle-orm";
import { int } from "drizzle-orm/sqlite-core";

// it without a read-back.
const NOW_MS = sql`(unixepoch() * 1000)`;

export const COMMON_COLUMNS = {
    createdAt: int("created_at", { mode: "timestamp_ms" })
        .notNull()
        .default(NOW_MS)
        .$defaultFn(() => new Date()),
    updatedAt: int("updated_at", { mode: "timestamp_ms" })
        .notNull()
        .default(NOW_MS)
        .$defaultFn(() => new Date())
        .$onUpdateFn(() => new Date()),
};
