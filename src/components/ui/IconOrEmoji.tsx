import type { LucideIcon } from 'lucide-react'
import { isEmoji } from '@/utils/colorUtils'

interface IconOrEmojiProps {
    iconValue: string | undefined
    defaultIcon: LucideIcon
    color: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-12 h-12 text-xl',
    lg: 'w-16 h-16 text-2xl',
}

const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
}

/**
 * Renders either an emoji or a Lucide icon with consistent styling
 */
export function IconOrEmoji({
    iconValue,
    defaultIcon: DefaultIcon,
    color,
    size = 'md',
    className = '',
}: IconOrEmojiProps) {
    const baseClasses = `${sizeClasses[size]} rounded-xl flex items-center justify-center flex-shrink-0 ${className}`

    if (isEmoji(iconValue)) {
        // Render emoji in a colored container
        return (
            <div
                className={baseClasses}
                style={{ backgroundColor: `${color}15` }}
            >
                <span className="leading-none">{iconValue}</span>
            </div>
        )
    }

    // Render Lucide icon
    return (
        <div
            className={baseClasses}
            style={{ backgroundColor: `${color}15` }}
        >
            <DefaultIcon
                size={iconSizes[size]}
                style={{ color }}
                strokeWidth={2}
            />
        </div>
    )
}
