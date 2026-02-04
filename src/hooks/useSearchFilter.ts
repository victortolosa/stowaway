
import { useMemo } from 'react'
import { Item, Container } from '@/types'

type SearchableItem = Item | Container

interface UseSearchFilterProps<T> {
    data: T[]
    searchQuery: string
    searchKeys: (keyof T)[]
    additionalFilter?: (item: T) => boolean
}

export function useSearchFilter<T extends SearchableItem>({
    data,
    searchQuery,
    searchKeys,
    additionalFilter
}: UseSearchFilterProps<T>) {
    return useMemo(() => {
        if (!searchQuery) return data

        const query = searchQuery.toLowerCase()

        return data.filter((item) => {
            // filtering logic
            const matchesSearch = searchKeys.some((key) => {
                const value = item[key]
                if (typeof value === 'string') {
                    return value.toLowerCase().includes(query)
                }
                if (Array.isArray(value)) {
                    return value.some((v) => typeof v === 'string' && v.toLowerCase().includes(query))
                }
                return false
            })

            if (!matchesSearch) return false

            if (additionalFilter) {
                return additionalFilter(item)
            }

            return true
        })
    }, [data, searchQuery, searchKeys, additionalFilter])
}
