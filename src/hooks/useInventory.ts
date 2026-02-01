import { useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { useInventoryStore } from '@/store/inventory'
import { getUserPlaces, getPlaceContainers, getContainerItems } from '@/services/firebaseService'

/**
 * Hook to manage inventory data loading
 * Loads places, containers, and items for the current user
 */
export function useInventory() {
  const user = useAuthStore((state) => state.user)
  const { places, containers, items, setPlaces, setContainers, setItems } =
    useInventoryStore()

  const loadInventory = useCallback(async () => {
    if (!user?.uid) return

    try {
      console.log('useInventory: Starting load for UID:', user.uid)
      // Load user's places
      const userPlaces = await getUserPlaces(user.uid)
      console.log('useInventory: Fetched places:', userPlaces.length)
      setPlaces(userPlaces)

      if (userPlaces.length === 0) {
        setContainers([])
        setItems([])
        return
      }

      // Load all containers for all places in parallel
      const containersPromises = userPlaces.map(place => getPlaceContainers(place.id))
      const containersResults = await Promise.all(containersPromises)
      const allContainers = containersResults.flat()
      setContainers(allContainers)

      if (allContainers.length === 0) {
        setItems([])
        return
      }

      // Load all items for all containers in parallel
      const itemsPromises = allContainers.map(container => getContainerItems(container.id))
      const itemsResults = await Promise.all(itemsPromises)
      const allItems = itemsResults.flat()
      setItems(allItems)
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }, [user, setPlaces, setContainers, setItems])

  useEffect(() => {
    loadInventory()
  }, [loadInventory])

  return { places, containers, items, refresh: loadInventory }
}
