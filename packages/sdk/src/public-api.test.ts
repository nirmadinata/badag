import type { DAG } from "@badag/core";
import { task } from "@badag/core";
import { describe, expect, expectTypeOf, it } from "vitest";

import * as sdk from "./index";

describe("@badag/sdk", () => {
    it("exposes createDAG as its only runtime export", () => {
        expect(Object.keys(sdk)).toStrictEqual(["createDAG"]);
    });

    it("returns a core DAG that wiring accepts", () => {
        const created = sdk.createDAG("etl");
        const dag = created.chain(task("extract", { fn: () => "raw" }));

        expectTypeOf(created).toEqualTypeOf<DAG<"etl">>();
        expect(dag.getTask("extract")?.name).toBe("extract");
    });
});
