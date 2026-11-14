import { branch, createDAG, sensor, task } from "@badag/sdk";

const vendorDrop = sensor("vendor-drop", {
    description: "Wait for the vendor drop",
    pokeIntervalMs: 60_000,
    predicate: async () => true,
});

const route = branch("route", {
    branches: ["us", "eu"] as const,
    choose: () => "us",
});

const us = task("us", { fn: () => "priced us" });
const eu = task("eu", { fn: () => "priced eu" });
const publish = task("publish", { fn: () => "published" });

export const regional = createDAG("fixture-regional")
    .chain(vendorDrop, route)
    .chain(route, [us, eu])
    .chain([us, eu], publish);

export default regional;
