import { createDAG, task } from "@badag/sdk";

const fetchPrices = task("fetch-prices", {
    fn: async () => ({ eu: 12, us: 10 }),
});

const normalize = task("normalize", {
    fn: () => "normalized",
});

const store = task("store", {
    fn: async () => ({ stored: true }),
});

export const pricing = createDAG("fixture-pricing").chain(
    fetchPrices,
    normalize,
    store
);

export default pricing;
