import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { useInventoryStore } from '@/store/inventory'
import { SearchResult } from '@/types'

interface SearchOptions {
  threshold?: number
  limit?: number
}

/**
 * Hook for fuzzy searching across places, containers, and items
 */
export function useSearch(query: string, options?: SearchOptions) {
  const { places, containers, items } = useInventoryStore()

  const results = useMemo(() => {
    if (!query.trim()) return []

    // Create a searchable dataset combining all data with breadcrumbs
    const searchData: SearchResult[] = items.map((item) => {
      const container = containers.find((c) => c.id === item.containerId)
      const place = container ? places.find((p) => p.id === container.placeId) : null

      return {
        item,
        container: container!,
        place: place!,
      }
    })

    // Configure Fuse for fuzzy search
    const fuse = new Fuse(searchData, {
      keys: [
        { name: 'item.name', weight: 1 },
        { name: 'item.description', weight: 0.8 },
        { name: 'item.tags', weight: 0.8 },
        { name: 'container.name', weight: 0.6 },
        { name: 'place.name', weight: 0.4 },
      ],
      threshold: options?.threshold ?? 0.4,
      includeScore: true,
    })

    return fuse.search(query).slice(0, options?.limit ?? 10).map((result) => result.item)
  }, [query, places, containers, items, options?.threshold, options?.limit])

  return results
}
