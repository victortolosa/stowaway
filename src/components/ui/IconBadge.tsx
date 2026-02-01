import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface IconBadgeProps {
  icon: LucideIcon
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-12 h-12 rounded-[12px]',
  md: 'w-14 h-14 rounded-[14px]',
  lg: 'w-20 h-20 rounded-[20px]',
}

const iconSizeMap = {
  sm: 24,
  md: 28,
  lg: 40,
}

export function IconBadge({ icon: Icon, color, size = 'md', className }: IconBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center flex-shrink-0',
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      <Icon size={iconSizeMap[size]} className="text-white" strokeWidth={2} />
    </div>
  )
}
