import { useAuthStore } from '@/store/auth'
import { useQuery } from '@tanstack/react-query'
import { getUserRecentActivity } from '@/services/firebaseService'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { ActivityFeed } from '@/components/ActivityFeed'

export function Activity() {
  const user = useAuthStore((state) => state.user)

  useBreadcrumbs([
    { label: 'Profile', categoryPath: '/profile' },
    { label: 'Activity' },
  ])

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activity', 'user', user?.uid],
    queryFn: () => getUserRecentActivity(user!.uid, 100),
    enabled: !!user?.uid,
    staleTime: 1000 * 60,
    retry: false,
  })

  return (
    <div className="pb-24 pt-2">
      <div className="max-w-mobile mx-auto px-1">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-6">Activity</h1>
        <ActivityFeed activities={activities} isLoading={isLoading} error={error as Error | null} />
      </div>
    </div>
  )
}
