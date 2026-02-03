import { create } from 'zustand'
import { Place, Container, Item, Group } from '@/types'

interface InventoryState {
  places: Place[]
  containers: Container[]
  items: Item[]
  groups: Group[]
  selectedPlace: Place | null
  selectedContainer: Container | null
  isLoading: boolean

  setPlaces: (places: Place[]) => void
  setContainers: (containers: Container[]) => void
  setItems: (items: Item[]) => void
  setGroups: (groups: Group[]) => void
  setSelectedPlace: (place: Place | null) => void
  setSelectedContainer: (container: Container | null) => void
  setLoading: (isLoading: boolean) => void
}

export const useInventoryStore = create<InventoryState>((set) => ({
  places: [],
  containers: [],
  items: [],
  groups: [],
  selectedPlace: null,
  selectedContainer: null,
  isLoading: false,

  setPlaces: (places) => set({ places }),
  setContainers: (containers) => set({ containers }),
  setItems: (items) => set({ items }),
  setGroups: (groups) => set({ groups }),
  setSelectedPlace: (place) => set({ selectedPlace: place }),
  setSelectedContainer: (container) => set({ selectedContainer: container }),
  setLoading: (isLoading) => set({ isLoading }),
}))
