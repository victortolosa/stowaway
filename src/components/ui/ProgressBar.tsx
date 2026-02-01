import { cn } from '@/lib/utils'

export interface ProgressBarProps {
  progress: number
  label?: string
  showPercentage?: boolean
  className?: string
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  className,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="font-body text-[13px] text-text-secondary">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="font-body text-[13px] text-text-secondary">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-aqua transition-all duration-300"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
}
