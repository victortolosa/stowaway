import { Users } from 'lucide-react'
import { Place } from '@/types'
import { IconOrEmoji, Badge } from '@/components/ui'
import { ImageCarousel } from '@/components/ui'
import { getPlaceIcon, DEFAULT_PLACE_COLOR } from '@/utils/colorUtils'

interface PlaceHeroProps {
    place: Place
    containerCount: number
    itemCount: number
    onImageClick?: () => void
    isShared?: boolean
}

export function PlaceHero({ place, containerCount, itemCount, onImageClick, isShared }: PlaceHeroProps) {
    if (place.photos && place.photos.length > 0) {
        return (
            <div className="mb-6">
                <div className="rounded-2xl overflow-hidden aspect-[21/9] mb-6 shadow-sm border border-border-light bg-bg-surface">
                    <ImageCarousel
                        images={place.photos}
                        alt={place.name}
                        onImageClick={onImageClick}
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="h1 text-text-primary">
                                {place.name}
                            </h1>
                            {isShared && (
                                <Badge size="sm" variant="info" className="inline-flex items-center gap-1.5 rounded-full">
                                    <Users size={12} strokeWidth={2.5} />
                                    Shared
                                </Badge>
                            )}
                        </div>
                        <p className="text-body-sm text-text-secondary">
                            {containerCount} containers · {itemCount} items
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-4 mb-8">
            <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={place.color || DEFAULT_PLACE_COLOR} size="md" />
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <h1 className="h1 text-text-primary">
                        {place.name}
                    </h1>
                    {isShared && (
                        <Badge size="sm" variant="info" className="inline-flex items-center gap-1.5 rounded-full">
                            <Users size={12} strokeWidth={2.5} />
                            Shared
                        </Badge>
                    )}
                </div>
                <p className="text-body-sm text-text-secondary">
                    {containerCount} containers · {itemCount} items
                </p>
            </div>
        </div>
    )
}
