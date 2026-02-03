import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { useInventoryStore } from '@/store/inventory'
import { getUserPlaces, getPlaceContainers, getContainerItems, getUserGroups } from '@/services/firebaseService'

/**
 * Hook to manage inventory data loading
 * Loads places, containers, and items for the current user
 */
export function useInventory() {
  const user = useAuthStore((state) => state.user)
  const { places, containers, items, groups, isLoading, setPlaces, setContainers, setItems, setGroups, setLoading } =
    useInventoryStore()

  const userId = user?.uid

  const loadInventory = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      console.log('useInventory: Starting load for UID:', userId)
      // Load user's places
      const userPlaces = await getUserPlaces(userId)
      console.log('useInventory: Fetched places:', userPlaces.length)
      setPlaces(userPlaces)

      if (userPlaces.length === 0) {
        setContainers([])
        setItems([])
        setLoading(false)
        return
      }

      // Load all containers for all places in parallel
      const containersPromises = userPlaces.map(place => getPlaceContainers(place.id))
      const containersResults = await Promise.all(containersPromises)
      const allContainers = containersResults.flat()
      setContainers(allContainers)

      if (allContainers.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      // Load all items for all containers in parallel
      const itemsPromises = allContainers.map(container => getContainerItems(container.id))
      const itemsResults = await Promise.all(itemsPromises)
      const allItems = itemsResults.flat()
      setItems(allItems)

      // Load user's groups
      const userGroups = await getUserGroups(userId)
      setGroups(userGroups)

      setLoading(false)
    } catch (error) {
      console.error('Error loading inventory:', error)
      setLoading(false)
    }
  }, [userId, setPlaces, setContainers, setItems, setGroups, setLoading])

  useEffect(() => {
    // Only load if we have no places and aren't currently loading
    // This prevents infinite loops if dependencies change but data is already there
    if (places.length === 0 && !isLoading && user?.uid) {
      loadInventory()
    }
  }, [loadInventory, places.length, isLoading, user?.uid])

  return { places, containers, items, groups, isLoading, refresh: loadInventory }
}
