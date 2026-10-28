import { describe, expect, it } from "vitest";

import { FNV_128_HEX_LENGTH, fnv1a128, hashTaskId } from "./hash";

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
    it("is deterministic for the same name and source", () => {
        expect(hashTaskId("extract", "raw")).toBe(hashTaskId("extract", "raw"));
    });

    it("returns a lowercase hex digest of the expected length", () => {
        const id = hashTaskId("extract", "raw");

        expect(id).toHaveLength(FNV_128_HEX_LENGTH);
        expect(id).toMatch(/^[0-9a-f]+$/u);
    });

    it("changes when the name changes", () => {
        expect(hashTaskId("extract", "raw")).not.toBe(
            hashTaskId("load", "raw")
        );
    });

    it("changes when the behavior source changes", () => {
        expect(hashTaskId("extract", "raw")).not.toBe(
            hashTaskId("extract", "clean")
        );
    });
});
