import { useQuery } from '@tanstack/react-query'
import { getAccessibleItems, getRecentItems } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useMemo } from 'react'

export const ALL_ITEMS_KEYS = {
    all: ['items', 'all'] as const,
    list: (userId: string) => [...ALL_ITEMS_KEYS.all, userId] as const,
    recent: (userId: string) => [...ALL_ITEMS_KEYS.all, 'recent', userId] as const,
}

export function useAllItems() {
    const user = useAuthStore((state) => state.user)
    const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
    const placeIds = useMemo(() => places.map((place) => place.id).sort(), [places])

    return useQuery({
        queryKey: user?.uid ? [...ALL_ITEMS_KEYS.list(user.uid), placeIds] : ['items', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getAccessibleItems(placeIds)
        },
        enabled: !!user?.uid && !isPlacesLoading,
    })
}

export function useRecentItems(limitCount = 20) {
    const user = useAuthStore((state) => state.user)
    const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
    const placeIds = useMemo(() => places.map((place) => place.id).sort(), [places])

    return useQuery({
        queryKey: user?.uid ? [...ALL_ITEMS_KEYS.recent(user.uid), placeIds] : ['items', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getRecentItems(user.uid, limitCount)
        },
        enabled: !!user?.uid && !isPlacesLoading,
    })
}
