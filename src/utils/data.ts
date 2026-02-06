export function sanitizeUndefined<T extends object>(obj: T): T {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    ) as T
}

/**
 * Compare an updates object against old data and return only the keys
 * whose values actually changed. Handles arrays, deleteField sentinels,
 * and primitive values.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function getChangedFields(
    updates: Record<string, any>,
    oldData: Record<string, any>
): string[] {
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return Object.keys(updates).filter((key) => {
        const newVal = updates[key]
        const oldVal = oldData[key]

        // deleteField() sentinel — always counts as a change
        if (newVal != null && typeof newVal === 'object' && '_methodName' in (newVal as object)) {
            return oldVal !== undefined && oldVal !== null
        }

        // Skip undefined updates (sanitizeUndefined will strip them anyway)
        if (newVal === undefined) return false

        // Array comparison (photos, tags)
        if (Array.isArray(newVal) && Array.isArray(oldVal)) {
            if (newVal.length !== oldVal.length) return true
            return newVal.some((v, i) => v !== oldVal[i])
        }

        return newVal !== oldVal
    })
}
