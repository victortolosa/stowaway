import { type LucideIcon } from 'lucide-react'
import { Card } from './Card'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  message: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <Card padding="lg" className={cn('text-center', className)}>
      {Icon && (
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-bg-subtle flex items-center justify-center">
          <Icon size={24} className="text-text-secondary" />
        </div>
      )}
      {title && (
        <h3 className="h3 text-text-primary mb-2">
          {title}
        </h3>
      )}
      <p className="text-body-sm text-text-secondary mb-6 max-w-xs mx-auto">{message}</p>
      {actionLabel && onAction && (
        <Button variant="ghost" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  )
}
