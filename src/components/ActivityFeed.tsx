import { Activity } from '@/types'
import { Card } from '@/components/ui'
import {
  Plus,
  Pencil,
  Trash2,
  ArrowRightLeft,
  QrCode,
  Eye,
  Type,
  LogIn,
  LogOut,
  Group,
  Ungroup,
  MapPin,
  Package,
  Box,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

const ACTION_ICONS: Record<Activity['action'], typeof Plus> = {
  created: Plus,
  updated: Pencil,
  renamed: Type,
  deleted: Trash2,
  moved: ArrowRightLeft,
  added_to: LogIn,
  removed_from: LogOut,
  grouped: Group,
  ungrouped: Ungroup,
  scanned: QrCode,
  viewed: Eye,
}

const ACTION_COLORS: Record<Activity['action'], string> = {
  created: 'text-green-500 bg-green-500/10',
  updated: 'text-blue-500 bg-blue-500/10',
  renamed: 'text-amber-500 bg-amber-500/10',
  deleted: 'text-red-500 bg-red-500/10',
  moved: 'text-purple-500 bg-purple-500/10',
  added_to: 'text-green-400 bg-green-400/10',
  removed_from: 'text-orange-500 bg-orange-500/10',
  grouped: 'text-indigo-500 bg-indigo-500/10',
  ungrouped: 'text-pink-500 bg-pink-500/10',
  scanned: 'text-accent-aqua bg-accent-aqua/10',
  viewed: 'text-gray-400 bg-gray-400/10',
}

const ENTITY_ICONS: Record<Activity['entityType'], typeof MapPin> = {
  place: MapPin,
  container: Package,
  item: Box,
}

function getActionText(activity: Activity): string {
  const meta = activity.metadata

  switch (activity.action) {
    case 'created':
      return `Created ${activity.entityType}`
    case 'updated':
      if (meta?.changedFields?.length) {
        return `Updated ${meta.changedFields.join(', ')}`
      }
      return `Updated ${activity.entityType}`
    case 'renamed':
      if (meta?.oldValue && meta?.newValue) {
        return `Renamed from "${meta.oldValue}" to "${meta.newValue}"`
      }
      return `Renamed ${activity.entityType}`
    case 'deleted':
      return `Deleted ${activity.entityType}`
    case 'moved':
      if (meta?.fromContainerName && meta?.toContainerName) {
        return `Moved from "${meta.fromContainerName}" to "${meta.toContainerName}"`
      }
      if (meta?.fromPlaceName && meta?.toPlaceName) {
        return `Moved from "${meta.fromPlaceName}" to "${meta.toPlaceName}"`
      }
      return `Moved ${activity.entityType}`
    case 'added_to':
      if (meta?.childEntityName && meta?.childEntityType) {
        return `${meta.childEntityType} "${meta.childEntityName}" added`
      }
      return `New content added`
    case 'removed_from':
      if (meta?.childEntityName && meta?.childEntityType) {
        return `${meta.childEntityType} "${meta.childEntityName}" removed`
      }
      return `Content removed`
    case 'grouped':
      if (meta?.groupName && meta?.itemCount) {
        return `Grouped ${meta.itemCount} items into "${meta.groupName}"`
      }
      return `Items grouped`
    case 'ungrouped':
      if (meta?.groupName && meta?.itemCount) {
        return `Ungrouped ${meta.itemCount} items from "${meta.groupName}"`
      }
      return `Items ungrouped`
    case 'scanned':
      return `Scanned QR code`
    case 'viewed':
      return `Viewed ${activity.entityType}`
  }
}

interface ActivityFeedProps {
  activities: Activity[]
  isLoading?: boolean
  error?: Error | null
}

export function ActivityFeed({ activities, isLoading, error }: ActivityFeedProps) {
  const user = useAuthStore((state) => state.user)

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-aqua" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-4">
        <p className="font-body text-sm text-accent-danger font-medium mb-1">Failed to load activity</p>
        <p className="font-body text-xs text-text-secondary break-all">
          {String(error?.message || error)}
        </p>
        <p className="font-body text-xs text-text-tertiary mt-2">
          If you see a Firestore index error, click the link in your browser console to create the required index.
        </p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="font-body text-text-secondary">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {activities.map((activity) => {
        const ActionIcon = ACTION_ICONS[activity.action]
        const colorClasses = ACTION_COLORS[activity.action]
        const [iconColor, iconBg] = colorClasses.split(' ')
        const EntityIcon = ENTITY_ICONS[activity.entityType]
        const actorLabel = activity.userId === user?.uid
          ? 'You'
          : (activity.actorName || activity.actorEmail || 'Someone')

        return (
          <Card key={activity.id} padding="md" className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
              <ActionIcon size={16} className={iconColor} strokeWidth={2.5} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <EntityIcon size={12} className="text-text-tertiary shrink-0" />
                <span className="font-display text-sm font-semibold text-text-primary truncate">
                  {activity.entityName}
                </span>
              </div>
              <p className="font-body text-sm text-text-secondary leading-snug">
                {getActionText(activity)}
              </p>
              <p className="font-body text-xs text-text-tertiary mt-1">
                {actorLabel} · {getRelativeTime(activity.createdAt)}
              </p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
