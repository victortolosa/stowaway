import { useEffect } from 'react'
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

  useEffect(() => {
    if (!user?.uid) return

    const loadInventory = async () => {
      try {
        // Load user's places
        const userPlaces = await getUserPlaces(user.uid)
        setPlaces(userPlaces)

        // Load containers for each place
        const allContainers: typeof containers = []
        for (const place of userPlaces) {
          const placeContainers = await getPlaceContainers(place.id)
          allContainers.push(...placeContainers)
        }
        setContainers(allContainers)

        // Load items for each container
        const allItems: typeof items = []
        for (const container of allContainers) {
          const containerItems = await getContainerItems(container.id)
          allItems.push(...containerItems)
        }
        setItems(allItems)
      } catch (error) {
        console.error('Error loading inventory:', error)
      }
    }

    loadInventory()
  }, [user?.uid, setPlaces, setContainers, setItems])

  return { places, containers, items }
}
