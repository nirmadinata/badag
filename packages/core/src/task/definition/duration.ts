function assertFinite(label: string, value: number): void {
    if (!Number.isFinite(value)) {
        throw new TypeError(`${label} must be a finite number`);
    }
}

/** Validate a non-negative duration in milliseconds. */
export function assertNonNegativeDuration(label: string, value: number): void {
    assertFinite(label, value);

    if (value < 0) {
        throw new Error(`${label} must be greater than or equal to 0`);
    }
}

/** Validate a positive duration in milliseconds. */
export function assertPositiveDuration(label: string, value: number): void {
    assertFinite(label, value);

    if (value <= 0) {
        throw new Error(`${label} must be greater than 0`);
    }
}
