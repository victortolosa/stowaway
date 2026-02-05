import { Place } from '@/types'
import { IconOrEmoji } from '@/components/ui'
import { ImageCarousel } from '@/components/ui'
import { getPlaceIcon, DEFAULT_PLACE_COLOR } from '@/utils/colorUtils'

interface PlaceHeroProps {
    place: Place
    containerCount: number
    itemCount: number
    onImageClick?: () => void
}

export function PlaceHero({ place, containerCount, itemCount, onImageClick }: PlaceHeroProps) {
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
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                            Place
                        </span>
                        <h1 className="h1 text-text-primary">
                            {place.name}
                        </h1>
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
            <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                    Place
                </span>
                <h1 className="h1 text-text-primary">
                    {place.name}
                </h1>
                <p className="text-body-sm text-text-secondary">
                    {containerCount} containers · {itemCount} items
                </p>
            </div>
        </div>
    )
}
