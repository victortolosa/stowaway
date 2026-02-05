import { useQuery } from '@tanstack/react-query'
import { getObjectsByGroup } from '@/services/firebaseService'

export const GROUP_OBJECTS_KEYS = {
    all: ['group-objects'] as const,
    byGroup: (groupId: string, type: string) => [...GROUP_OBJECTS_KEYS.all, groupId, type] as const,
}

export function useGroupObjects(groupId: string | undefined | null, type: 'place' | 'container' | 'item' | undefined) {
    return useQuery({
        queryKey: groupId && type ? GROUP_OBJECTS_KEYS.byGroup(groupId, type) : ['group-objects', 'disabled'],
        queryFn: () => {
            if (!groupId || !type) throw new Error('GroupId and type are required')
            return getObjectsByGroup(groupId, type)
        },
        enabled: !!groupId && !!type,
    })
}
