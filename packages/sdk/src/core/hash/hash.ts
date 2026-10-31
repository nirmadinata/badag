/** FNV-1a 128-bit parameters; see draft-eastlake-fnv-22. */
const FNV_OFFSET_BASIS = 0x6c_62_27_2e_07_bb_01_42_62_b8_21_75_62_95_c5_8dn;

const FNV_PRIME = 0x00_00_00_00_01_00_00_00_00_00_00_00_00_00_01_3bn;

const UINT128_MASK = 0xff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ff_ffn;

/** Width of the rendered 128-bit digest. */
export const FNV_128_HEX_LENGTH = 32;

/** Reused across hashes so each call does not allocate a new encoder. */
const TEXT_ENCODER = new TextEncoder();

/**
 * Hash a string with FNV-1a over its UTF-8 bytes.
 *
 * Uses only standard platform APIs (`TextEncoder` and `BigInt`), so it runs
 * unchanged in Node, Bun, browsers, and Cloudflare Workers. The 128-bit digest
 * is rendered as 32 lowercase hex characters.
 */
export function fnv1a128(value: string): string {
    const bytes = TEXT_ENCODER.encode(value);
    let hash = FNV_OFFSET_BASIS;

    for (const byte of bytes) {
        // oxlint-disable-next-line no-bitwise -- FNV-1a mixes each byte with XOR.
        hash ^= BigInt(byte);
        // oxlint-disable-next-line no-bitwise -- masking wraps the hash at 128 bits.
        hash = (hash * FNV_PRIME) & UINT128_MASK;
    }

    return hash.toString(16).padStart(FNV_128_HEX_LENGTH, "0");
}

/**
 * Derive the task ID from the task name and behavior source.
 *
 * Stable within one build of the program: callback behavior sources come from
 * function source text, so minification changes the result.
 */
export function hashTaskId(name: string, source: string): string {
    return fnv1a128(JSON.stringify([name, source]));
}
