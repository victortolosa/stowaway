import { type ReactNode } from 'react'
import { Plus, type LucideIcon } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  actionLabel?: string
  actionIcon?: LucideIcon
  onAction?: () => void
  children?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  actionLabel,
  actionIcon: ActionIcon = Plus,
  onAction,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex justify-between items-center mb-6', className)}>
      <h1 className="font-display text-[28px] font-bold text-text-primary">
        {title}
      </h1>
      {onAction && (
        <Button
          variant="primary"
          size="sm"
          leftIcon={ActionIcon}
          onClick={onAction}
        >
          {actionLabel || 'Add'}
        </Button>
      )}
      {children}
    </div>
  )
}
