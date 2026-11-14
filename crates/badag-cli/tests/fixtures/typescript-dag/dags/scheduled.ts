import { createDAG, delay, shortCircuit, task, trigger } from "@badag/sdk";

const settle = delay("settle", { durationMs: 5000 });

const hasWork = shortCircuit("has-work", { condition: () => true });

const extract = task("extract", { fn: () => "rows" });

const startPricing = trigger("start-pricing", {
    dagName: "fixture-pricing",
    waitForCompletion: true,
});

export const scheduled = createDAG("fixture-scheduled").chain(
    settle,
    hasWork,
    extract,
    startPricing
);

export default scheduled;
