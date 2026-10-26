import { describe, expect, it } from "vitest";

import { FNV_128_HEX_LENGTH, fnv1a128, hashTaskId } from "./hash";

const rawFn = (): string => "raw";
const cleanFn = (): string => "clean";
const makeFn = (value: string) => (): string => value;

describe("FNV-1a 128", () => {
    it("matches the FNV reference vectors", () => {
        expect(fnv1a128("")).toBe("6c62272e07bb014262b821756295c58d");
        expect(fnv1a128("a")).toBe("d228cb696f1a8caf78912b704e4a8964");
        expect(fnv1a128("foobar")).toBe("343e1662793c64bf6f0d3597ba446f18");
    });

    it("hashes UTF-8 bytes", () => {
        expect(fnv1a128("é")).toBe("088093bf9eab1be95aa0733054c70821");
    });
});

describe("task ID hashing", () => {
    it("is deterministic for the same name and function", () => {
        expect(hashTaskId("extract", rawFn)).toBe(hashTaskId("extract", rawFn));
    });

    it("returns a lowercase hex digest of the expected length", () => {
        const id = hashTaskId("extract", rawFn);

        expect(id).toHaveLength(FNV_128_HEX_LENGTH);
        expect(id).toMatch(/^[0-9a-f]+$/u);
    });

    it("changes when the name changes", () => {
        expect(hashTaskId("extract", rawFn)).not.toBe(
            hashTaskId("load", rawFn)
        );
    });

    it("changes when the function source changes", () => {
        expect(hashTaskId("extract", rawFn)).not.toBe(
            hashTaskId("extract", cleanFn)
        );
    });

    it("ignores values captured by the closure", () => {
        expect(hashTaskId("extract", makeFn("raw"))).toBe(
            hashTaskId("extract", makeFn("clean"))
        );
    });
});
