import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { Card } from './Card'
import { IconBadge } from './IconBadge'
import { cn } from '@/lib/utils'

export interface ListItemProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconColor?: string
  image?: string
  leftContent?: ReactNode
  rightContent?: ReactNode
  showChevron?: boolean
  actions?: ReactNode
}

export const ListItem = forwardRef<HTMLDivElement, ListItemProps>(
  (
    {
      title,
      subtitle,
      icon,
      iconColor = '#71717A',
      image,
      leftContent,
      rightContent,
      showChevron = true,
      actions,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <Card
        ref={ref}
        variant="interactive"
        className={cn('flex items-center gap-[14px] relative group', className)}
        onClick={onClick}
        {...props}
      >
        {leftContent}
        {!leftContent && image && (
          <img
            src={image}
            alt={title}
            className="w-14 h-14 rounded-[14px] object-cover flex-shrink-0"
          />
        )}
        {!leftContent && !image && icon && (
          <IconBadge icon={icon} color={iconColor} />
        )}

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h3 className="font-body text-[16px] font-semibold text-text-primary truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="font-body text-[13px] text-text-secondary truncate">
              {subtitle}
            </p>
          )}
        </div>

        {rightContent}
        {actions}
        {showChevron && (
          <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" strokeWidth={2} />
        )}
      </Card>
    )
  }
)

ListItem.displayName = 'ListItem'
