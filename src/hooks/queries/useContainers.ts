import { useQuery } from '@tanstack/react-query'
import { getPlaceContainers, getContainer } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'

export const CONTAINER_KEYS = {
    all: ['containers'] as const,
    byPlace: (placeId: string) => [...CONTAINER_KEYS.all, 'place', placeId] as const,
    details: () => [...CONTAINER_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...CONTAINER_KEYS.details(), id] as const,
}

export function useContainer(id: string) {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: id ? CONTAINER_KEYS.detail(id) : ['containers', 'disabled'],
        queryFn: () => {
            if (!id) throw new Error('Container ID is required')
            return getContainer(id)
        },
        enabled: !!user?.uid && !!id,
    })
}

export function usePlaceContainers(placeId: string) {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: placeId ? CONTAINER_KEYS.byPlace(placeId) : ['containers', 'disabled'],
        queryFn: () => {
            if (!placeId) throw new Error('Place ID is required')
            return getPlaceContainers(placeId)
        },
        enabled: !!user?.uid && !!placeId,
    })
}
