import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { useInventoryStore } from '@/store/inventory'


export type SearchFilterType = 'all' | 'item' | 'container' | 'place'

interface SearchOptions {
  threshold?: number
  limit?: number
  filters?: {
    type?: SearchFilterType
    hasPhoto?: boolean
    hasAudio?: boolean
  }
}

/**
 * Hook for fuzzy searching across places, containers, and items
 */
export function useSearch(query: string, options?: SearchOptions) {
  const { places, containers, items } = useInventoryStore()

  const results = useMemo(() => {
    if (!query.trim()) return []

    // Create a searchable dataset combining all data
    const searchItems = items.map((item) => {
      const container = containers.find((c) => c.id === item.containerId)
      const place = container ? places.find((p) => p.id === container.placeId) : null
      return { item, container, place, type: 'item' as const }
    })

    const searchContainers = containers.map((container) => {
      const place = places.find((p) => p.id === container.placeId)
      return { item: container, container: undefined, place, type: 'container' as const }
    })

    const searchPlaces = places.map((place) => {
      return { item: place, container: undefined, place: undefined, type: 'place' as const }
    })

    const searchData = [...searchItems, ...searchContainers, ...searchPlaces]

    // Configure Fuse for fuzzy search
    const fuse = new Fuse(searchData, {
      keys: [
        { name: 'item.name', weight: 1 },         // Works for Item, Container, Place
        { name: 'item.description', weight: 0.8 }, // Works for Item
        { name: 'item.tags', weight: 0.8 },       // Works for Item
        { name: 'container.name', weight: 0.6 },  // Context for Item
        { name: 'place.name', weight: 0.4 },      // Context for Item/Container
      ],
      threshold: options?.threshold ?? 0.4,
      includeScore: true,
    })

    let searchResults = fuse.search(query).map((result) => result.item)

    // Apply Filters
    if (options?.filters) {
      const { type, hasPhoto, hasAudio } = options.filters

      if (type && type !== 'all') {
        searchResults = searchResults.filter((result) => result.type === type)
      }

      if (hasPhoto) {
        searchResults = searchResults.filter((result) => {
          const entity = result.item as any
          return entity.photos && entity.photos.length > 0
        })
      }

      if (hasAudio) {
        searchResults = searchResults.filter((result) => {
          const entity = result.item as any
          return !!entity.voiceNoteUrl
        })
      }
    }

    return searchResults.slice(0, options?.limit ?? 20)
  }, [query, places, containers, items, options?.threshold, options?.limit, options?.filters])

  return results
}
