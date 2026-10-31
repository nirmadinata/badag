import { describe, expect, it } from "vitest";

import { taskBehaviorSource } from "./definition/identity";
import { branch } from "./factories/branch";
import { delay } from "./factories/delay";
import { sensor } from "./factories/sensor";
import { shortCircuit } from "./factories/short-circuit";
import { task } from "./factories/task";
import { trigger } from "./factories/trigger";

const makeTaskFn = (value: string) => () => value;

describe("task definition identity", () => {
    it("uses the regular function source and ignores closure values", () => {
        const first = task("extract", { fn: makeTaskFn("raw") });
        const second = task("extract", { fn: makeTaskFn("clean") });

        expect(taskBehaviorSource(first)).toBe(taskBehaviorSource(second));
        expect(taskBehaviorSource(first)).not.toBe(
            taskBehaviorSource(task("extract", { fn: () => "raw" }))
        );
    });

    it("includes the task kind", () => {
        const regular = task("ready", { fn: () => true });
        const sensorTask = sensor("ready", { predicate: () => true });

        expect(taskBehaviorSource(regular)).not.toBe(
            taskBehaviorSource(sensorTask)
        );
    });

    it("uses kind-specific behavior fields", () => {
        expect(taskBehaviorSource(delay("wait", { durationMs: 1 }))).not.toBe(
            taskBehaviorSource(delay("wait", { durationMs: 2 }))
        );
        expect(
            taskBehaviorSource(branch("route", { choose: () => "a" }))
        ).not.toBe(taskBehaviorSource(branch("route", { choose: () => "b" })));
        expect(
            taskBehaviorSource(shortCircuit("gate", { condition: () => true }))
        ).not.toBe(
            taskBehaviorSource(shortCircuit("gate", { condition: () => false }))
        );
        expect(taskBehaviorSource(trigger("start", { dagName: "a" }))).not.toBe(
            taskBehaviorSource(trigger("start", { dagName: "b" }))
        );
        expect(taskBehaviorSource(trigger("start", { dagName: "a" }))).not.toBe(
            taskBehaviorSource(
                trigger("start", { dagName: "a", waitForCompletion: true })
            )
        );
    });
});
