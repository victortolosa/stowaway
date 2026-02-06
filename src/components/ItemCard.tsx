import { Mic } from 'lucide-react'
import { Card, IconOrEmoji } from '@/components/ui'
import { Item } from '@/types'
import { formatTimeAgo } from '@/utils/date'
import { getItemIcon } from '@/utils/colorUtils'

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
            className={`overflow-hidden flex flex-col h-full group ${className}`}
            onClick={onClick}
        >
            {item.photos && item.photos[0] ? (
                <div className="w-full aspect-[4/3] relative overflow-hidden bg-bg-surface-alt">
                    <img
                        src={item.photos[0]}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>
            ) : (
                <div className="w-full aspect-[4/3] bg-bg-surface-alt flex items-center justify-center border-b border-border-light">
                    <IconOrEmoji iconValue={item.icon} defaultIcon={getItemIcon()} color={item.color || '#3B82F6'} size="lg" />
                </div>
            )}

            <div className="p-4 flex flex-col gap-2 flex-1 min-h-0">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-[16px] font-semibold text-text-primary truncate leading-snug flex-1">
                        {item.name}
                    </h3>
                    {item.voiceNoteUrl && (
                        <Mic size={14} className="text-accent-aqua flex-shrink-0 mt-0.5" />
                    )}
                </div>

                {location && (
                    <p className="font-body text-[13px] text-text-secondary truncate">
                        {location}
                    </p>
                )}

                {!location && item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 overflow-hidden h-[20px]">
                        {item.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[11px] bg-bg-subtle text-text-secondary px-2 py-0.5 rounded-full font-medium border border-border-light">
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}

                {showDate && (
                    <div className="mt-auto pt-3 border-t border-border-light/50 flex items-center justify-between">
                        <span className="font-body text-[12px] text-text-tertiary">
                            {formatTimeAgo(item.createdAt)}
                        </span>
                    </div>
                )}
            </div>
        </Card>
    )
}
