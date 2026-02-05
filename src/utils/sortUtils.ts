import { Timestamp } from 'firebase/firestore'

export type SortOption = 'recently-added' | 'oldest-first' | 'a-z' | 'z-a' | 'recently-modified'

export const toDate = (timestamp: Date | Timestamp | any): Date => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate()
    }
    if (timestamp instanceof Date) {
        return timestamp
    }
    // Handle serialized timestamps or other formats
    if (timestamp?.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000)
    }
    return new Date(timestamp || 0)
}

export const getSortLabel = (sortOption: SortOption): string => {
    switch (sortOption) {
        case 'recently-added': return 'Recently Added'
        case 'recently-modified': return 'Recently Modified'
        case 'oldest-first': return 'Oldest First'
        case 'a-z': return 'A-Z'
        case 'z-a': return 'Z-A'
        default: return ''
    }
}

export const sortItems = <T extends { name: string; createdAt: Date | Timestamp; lastAccessed?: Date | Timestamp }>(
    items: T[],
    sortBy: SortOption
): T[] => {
    const sorted = [...items]
    switch (sortBy) {
        case 'recently-added':
            return sorted.sort((a, b) => {
                const dateA = toDate(a.createdAt)
                const dateB = toDate(b.createdAt)
                return dateB.getTime() - dateA.getTime()
            })
        case 'recently-modified':
            return sorted.sort((a, b) => {
                const dateA = toDate(a.lastAccessed || a.createdAt)
                const dateB = toDate(b.lastAccessed || b.createdAt)
                return dateB.getTime() - dateA.getTime()
            })
        case 'oldest-first':
            return sorted.sort((a, b) => {
                const dateA = toDate(a.createdAt)
                const dateB = toDate(b.createdAt)
                return dateA.getTime() - dateB.getTime()
            })
        case 'a-z':
            return sorted.sort((a, b) => a.name.localeCompare(b.name))
        case 'z-a':
            return sorted.sort((a, b) => b.name.localeCompare(a.name))
        default:
            return sorted
    }
}
