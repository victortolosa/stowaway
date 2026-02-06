/**
 * Generates an auto-incremented name from a template.
 *
 * @param template - Base name (e.g., "Holiday Bin")
 * @param number - Current number to append
 * @param padLength - How many digits to pad (default: 2)
 * @returns Formatted name (e.g., "Holiday Bin 01")
 *
 * @example
 * generateAutoIncrementName("Holiday Bin", 1)  // "Holiday Bin 01"
 * generateAutoIncrementName("Holiday Bin", 12) // "Holiday Bin 12"
 * generateAutoIncrementName("Box", 5, 3)       // "Box 005"
 */
export function generateAutoIncrementName(
    template: string,
    number: number,
    padLength: number = 2
): string {
    const paddedNumber = String(number).padStart(padLength, '0')
    return `${template} ${paddedNumber}`
}
