import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { Item, Container, Place } from '@/types'

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

export type SearchDataItem =
  | { type: 'item'; item: Item; container?: Container; place?: Place }
  | { type: 'container'; item: Container; container?: undefined; place?: Place }
  | { type: 'place'; item: Place; container?: undefined; place?: undefined }

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
/**
 * Hook for fuzzy searching across places, containers, and items
 */
export function useSearch(
  query: string,
  data: { items: Item[], containers: Container[], places: Place[] },
  options?: SearchOptions
) {
  const { items, containers, places } = data
  const threshold = options?.threshold
  const limit = options?.limit
  const filters = options?.filters

  const results = useMemo(() => {
    if (!query.trim()) return []

    // Create a searchable dataset combining all data
    const searchItems: SearchDataItem[] = items.map((item) => {
      const container = containers.find((c) => c.id === item.containerId)
      const place = container ? places.find((p) => p.id === container.placeId) : undefined
      return { item, container, place, type: 'item' }
    })

    const searchContainers: SearchDataItem[] = containers.map((container) => {
      const place = places.find((p) => p.id === container.placeId)
      return { item: container, container: undefined, place, type: 'container' }
    })

    const searchPlaces: SearchDataItem[] = places.map((place) => {
      return { item: place, container: undefined, place: undefined, type: 'place' }
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
      threshold: threshold ?? 0.4,
      includeScore: true,
    })

    let searchResults = fuse.search(query).map((result) => result.item)

    // Apply Filters
    if (filters) {
      const { type, hasPhoto, hasAudio } = filters

      if (type && type !== 'all') {
        searchResults = searchResults.filter((result) => result.type === type)
      }

      if (hasPhoto) {
        searchResults = searchResults.filter((result) => {
          if (result.type === 'item') {
            return (result.item as Item).photos && (result.item as Item).photos.length > 0
          }
          return false
        })
      }

      if (hasAudio) {
        searchResults = searchResults.filter((result) => {
          if (result.type === 'item') {
            return !!(result.item as Item).voiceNoteUrl
          }
          return false
        })
      }
    }

    return searchResults.slice(0, limit ?? 20)
  }, [query, places, containers, items, threshold, limit, filters])

  return results
}
