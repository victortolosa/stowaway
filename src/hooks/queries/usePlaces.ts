import { useQuery } from '@tanstack/react-query'
import { getAccessiblePlaces, getPlace } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'

export const PLACE_KEYS = {
    all: ['places'] as const,
    lists: () => [...PLACE_KEYS.all, 'list'] as const,
    list: (userId: string) => [...PLACE_KEYS.lists(), userId] as const,
    details: () => [...PLACE_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...PLACE_KEYS.details(), id] as const,
}

export function usePlaces() {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: user?.uid ? PLACE_KEYS.list(user.uid) : ['places', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getAccessiblePlaces(user.uid)
        },
        enabled: !!user?.uid,
    })
}

export function usePlace(id: string) {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: id ? PLACE_KEYS.detail(id) : ['places', 'disabled'],
        queryFn: () => {
            if (!id) throw new Error('Place ID is required')
            return getPlace(id)
        },
        enabled: !!user?.uid && !!id,
    })
}
