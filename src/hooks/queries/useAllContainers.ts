import { useQuery } from '@tanstack/react-query'
import { getUserContainers } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'

export const ALL_CONTAINERS_KEYS = {
    all: ['containers', 'all'] as const,
    list: (userId: string) => [...ALL_CONTAINERS_KEYS.all, userId] as const,
}

export function useAllContainers() {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: user?.uid ? ALL_CONTAINERS_KEYS.list(user.uid) : ['containers', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getUserContainers(user.uid)
        },
        enabled: !!user?.uid,
    })
}
