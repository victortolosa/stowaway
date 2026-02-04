import { useQuery } from '@tanstack/react-query'
import { getUserGroups } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'

export const GROUP_KEYS = {
    all: ['groups'] as const,
    list: (userId: string) => [...GROUP_KEYS.all, 'list', userId] as const,
}

export function useGroups() {
    const user = useAuthStore((state) => state.user)

    return useQuery({
        queryKey: user?.uid ? GROUP_KEYS.list(user.uid) : ['groups', 'disabled'],
        queryFn: () => {
            if (!user?.uid) throw new Error('User not authenticated')
            return getUserGroups(user.uid)
        },
        enabled: !!user?.uid,
    })
}
