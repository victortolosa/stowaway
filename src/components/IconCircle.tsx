import { LucideIcon } from 'lucide-react'

interface IconCircleProps {
  icon: LucideIcon
  color: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
}

const iconSizeMap = {
  sm: 24,
  md: 28,
  lg: 40,
}

export function IconCircle({ icon: Icon, color, size = 'md' }: IconCircleProps) {
  return (
    <div
      className={`${sizeMap[size]} rounded-3xl flex items-center justify-center`}
      style={{ backgroundColor: color }}
    >
      <Icon size={iconSizeMap[size]} className="text-white" strokeWidth={2} />
    </div>
  )
}
