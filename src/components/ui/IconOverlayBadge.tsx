import type { LucideIcon } from 'lucide-react'
import { isEmoji } from '@/utils/colorUtils'
import { cn } from '@/lib/utils'

interface IconOverlayBadgeProps {
    iconValue: string | undefined
    defaultIcon: LucideIcon
    color: string
    className?: string
}

/**
 * A small icon/emoji badge intended to overlay a photo thumbnail corner, so a
 * card can show its image while still surfacing the entity's icon as an
 * at-a-glance cue. Uses a solid surface background + ring for contrast over
 * arbitrary imagery.
 */
export function IconOverlayBadge({
    iconValue,
    defaultIcon: DefaultIcon,
    color,
    className = '',
}: IconOverlayBadgeProps) {
    const baseClasses = cn(
        'w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0',
        'bg-bg-page shadow-sm ring-1 ring-border-light',
        className
    )

    if (isEmoji(iconValue)) {
        return (
            <div className={baseClasses}>
                <span className="text-[13px] leading-none">{iconValue}</span>
            </div>
        )
    }

    return (
        <div className={baseClasses}>
            <DefaultIcon size={13} style={{ color }} strokeWidth={2.25} />
        </div>
    )
}
