/** Render task or branch names for an error message. */
export function quoteNames(names: readonly string[]): string {
    return names.map((name) => `"${name}"`).join(", ");
}
