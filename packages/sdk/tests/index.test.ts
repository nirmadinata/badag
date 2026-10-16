import { describe, expect, it } from "vitest";

import { fn } from "../src";

describe("fn do", () => {
    it("fn", () => {
        expect(fn()).toBe("Hello, tsdown!");
    });
});
