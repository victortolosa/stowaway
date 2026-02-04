import { useQuery } from '@tanstack/react-query'
import { getUserItems, getRecentItems } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'

export const ALL_ITEMS_KEYS = {
    all: ['items', 'all'] as const,
    list: (userId: string) => [...ALL_ITEMS_KEYS.all, userId] as const,
    recent: (userId: string) => [...ALL_ITEMS_KEYS.all, 'recent', userId] as const,
}

export function useAllItems() {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: user?.uid ? ALL_ITEMS_KEYS.list(user.uid) : ['items', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getUserItems(user.uid)
        },
        enabled: !!user?.uid,
    })
}

export function useRecentItems(limitCount = 20) {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: user?.uid ? ALL_ITEMS_KEYS.recent(user.uid) : ['items', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getRecentItems(user.uid, limitCount)
        },
        enabled: !!user?.uid,
    })
}
