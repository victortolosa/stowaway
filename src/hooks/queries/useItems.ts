import { useQuery } from '@tanstack/react-query'
import { getContainerItems, getPlaceItems, getItem } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'

export const ITEM_KEYS = {
    all: ['items'] as const,
    byContainer: (containerId: string) => [...ITEM_KEYS.all, 'container', containerId] as const,
    byPlace: (placeId: string) => [...ITEM_KEYS.all, 'place', placeId] as const,
    details: () => [...ITEM_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...ITEM_KEYS.details(), id] as const,
}

export function useContainerItems(containerId: string) {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: containerId ? ITEM_KEYS.byContainer(containerId) : ['items', 'disabled'],
        queryFn: () => {
            if (!containerId) throw new Error('Container ID is required')
            return getContainerItems(containerId)
        },
        enabled: !!user?.uid && !!containerId,
    })
}

export function useItem(id: string) {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: id ? ITEM_KEYS.detail(id) : ['items', 'disabled'],
        queryFn: () => {
            if (!id) throw new Error('Item ID is required')
            return getItem(id)
        },
        enabled: !!user?.uid && !!id,
    })
}

export function usePlaceItems(placeId: string) {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: placeId ? ITEM_KEYS.byPlace(placeId) : ['items', 'disabled'],
        queryFn: () => {
            if (!placeId) throw new Error('Place ID is required')
            return getPlaceItems(placeId)
        },
        enabled: !!user?.uid && !!placeId,
    })
}
