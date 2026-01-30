import { create } from 'zustand'
import { Place, Container, Item } from '@/types'

interface InventoryState {
  places: Place[]
  containers: Container[]
  items: Item[]
  selectedPlace: Place | null
  selectedContainer: Container | null

  setPlaces: (places: Place[]) => void
  setContainers: (containers: Container[]) => void
  setItems: (items: Item[]) => void
  setSelectedPlace: (place: Place | null) => void
  setSelectedContainer: (container: Container | null) => void
}

export const useInventoryStore = create<InventoryState>((set) => ({
  places: [],
  containers: [],
  items: [],
  selectedPlace: null,
  selectedContainer: null,

  setPlaces: (places) => set({ places }),
  setContainers: (containers) => set({ containers }),
  setItems: (items) => set({ items }),
  setSelectedPlace: (place) => set({ selectedPlace: place }),
  setSelectedContainer: (container) => set({ selectedContainer: container }),
}))
