import { Package, Mic } from 'lucide-react'
import { Card } from '@/components/ui'
import { Item } from '@/types'
import { formatTimeAgo } from '@/utils/date'

interface ItemCardProps {
    item: Item
    location?: string
    onClick: () => void
    showDate?: boolean
    className?: string
}

export function ItemCard({
    item,
    location,
    onClick,
    showDate = true,
    className = ""
}: ItemCardProps) {
    return (
        <Card
            padding="none"
            variant="interactive"
            className={`overflow-hidden flex flex-col h-full ${className}`}
            onClick={onClick}
        >
            {/* Image */}
            {item.photos && item.photos[0] ? (
                <img
                    src={item.photos[0]}
                    alt={item.name}
                    className="w-full h-[140px] object-cover bg-gray-100"
                />
            ) : (
                <div className="w-full h-[140px] bg-bg-elevated flex items-center justify-center">
                    <Package size={32} className="text-text-tertiary" strokeWidth={2} />
                </div>
            )}

            {/* Content */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="font-body text-[15px] font-semibold text-text-primary truncate flex-1">
                        {item.name}
                    </h3>
                    {item.voiceNoteUrl && (
                        <Mic size={14} className="text-accent-aqua flex-shrink-0" />
                    )}
                </div>

                {location && (
                    <p className="font-body text-[13px] text-text-secondary truncate">
                        {location}
                    </p>
                )}

                {!location && item.tags && item.tags.length > 0 && (
                    <p className="font-body text-[12px] text-text-tertiary truncate">
                        {item.tags.join(', ')}
                    </p>
                )}

                {showDate && (
                    <span className="font-body text-[12px] text-text-tertiary mt-auto">
                        {formatTimeAgo(item.createdAt)}
                    </span>
                )}
            </div>
        </Card>
    )
}
