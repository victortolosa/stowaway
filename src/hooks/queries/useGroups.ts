import { useQuery } from '@tanstack/react-query'
import { getUserGroups, getGroup } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useMemo } from 'react'

export const GROUP_KEYS = {
    all: ['groups'] as const,
    list: (userId: string) => [...GROUP_KEYS.all, 'list', userId] as const,
    detail: (id: string) => [...GROUP_KEYS.all, 'detail', id] as const,
}

export function useGroups() {
    const user = useAuthStore((state) => state.user)
    const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
    const placeIds = useMemo(() => places.map((place) => place.id).sort(), [places])

    return useQuery({
        queryKey: user?.uid ? [...GROUP_KEYS.list(user.uid), placeIds] : ['groups', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getUserGroups(user.uid)
        },
        enabled: !!user?.uid && !isPlacesLoading,
    })
}

export function useGroup(id: string | undefined) {
    const user = useAuthStore((state) => state.user)
    return useQuery({
        queryKey: id ? GROUP_KEYS.detail(id) : ['groups', 'disabled'],
        queryFn: async () => {
            if (!id) throw new Error('Group ID is required')
            const group = await getGroup(id)
            if (!group) throw new Error('Group not found')
            return group
        },
        enabled: !!id && !!user?.uid,
    })
}
