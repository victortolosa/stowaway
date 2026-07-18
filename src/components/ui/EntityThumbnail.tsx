import type { LucideIcon } from 'lucide-react'
import { IconOrEmoji } from './IconOrEmoji'
import { IconOverlayBadge } from './IconOverlayBadge'

interface EntityThumbnailProps {
    photo?: string
    name: string
    iconValue: string | undefined
    defaultIcon: LucideIcon
    color: string
}

/**
 * Card thumbnail for an entity (container/item) in list views. When the entity
 * has a photo, it's shown as the thumbnail with the icon/emoji overlaid as a
 * corner badge so the intuitive icon cue is preserved. With no photo, the icon
 * is the thumbnail.
 */
export function EntityThumbnail({
    photo,
    name,
    iconValue,
    defaultIcon,
    color,
}: EntityThumbnailProps) {
    if (photo) {
        return (
            <div className="relative w-12 h-12 flex-shrink-0">
                <img
                    src={photo}
                    alt={name}
                    className="w-12 h-12 rounded-xl object-contain bg-bg-surface-alt border border-border-light/50"
                />
                <IconOverlayBadge
                    iconValue={iconValue}
                    defaultIcon={defaultIcon}
                    color={color}
                    className="absolute -bottom-1.5 -right-1.5"
                />
            </div>
        )
    }

    return (
        <IconOrEmoji iconValue={iconValue} defaultIcon={defaultIcon} color={color} />
    )
}
