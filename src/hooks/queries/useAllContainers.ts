import { useQuery } from '@tanstack/react-query'
import { getAccessibleContainers } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useMemo } from 'react'

export const ALL_CONTAINERS_KEYS = {
    all: ['containers', 'all'] as const,
    list: (userId: string) => [...ALL_CONTAINERS_KEYS.all, userId] as const,
}

export function useAllContainers() {
    const user = useAuthStore((state) => state.user)
    const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
    const placeIds = useMemo(() => places.map((place) => place.id).sort(), [places])

    return useQuery({
        queryKey: user?.uid ? [...ALL_CONTAINERS_KEYS.list(user.uid), placeIds] : ['containers', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getAccessibleContainers(placeIds)
        },
        enabled: !!user?.uid && !isPlacesLoading,
    })
}
