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
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-bg-elevated flex items-center justify-center">
          <Icon size={24} className="text-text-tertiary" />
        </div>
      )}
      {title && (
        <h3 className="font-display text-[18px] font-semibold text-text-primary mb-2">
          {title}
        </h3>
      )}
      <p className="font-body text-text-secondary mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button variant="ghost" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  )
}
