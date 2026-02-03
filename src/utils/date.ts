import { Timestamp } from 'firebase/firestore'

/**
 * Converts a Firestore Timestamp to a JavaScript Date object.
 * Returns the input if it's already a Date.
 */
export const toDate = (timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate()
    }
    return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

/**
 * Formats a date as a "time ago" string (e.g., "Just now", "2h", "5d").
 */
export const formatTimeAgo = (dateInput: Date | Timestamp): string => {
    const date = toDate(dateInput)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h`

    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d`
}
