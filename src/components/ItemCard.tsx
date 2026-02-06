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
    autoWidth?: boolean
}

export function ItemCard({
    item,
    location,
    onClick,
    showDate = true,
    className = "",
    autoWidth = false
}: ItemCardProps) {
    // Determine image or icon to show
    const hasPhoto = item.photos && item.photos[0]

    return (
        <Card
            padding="none"
            variant="interactive"
            className={`overflow-hidden flex flex-row h-[100px] group ${className}`}
            onClick={onClick}
        >
            {/* Left Side: Image or Icon (Square) */}
            <div className="h-full aspect-square relative flex-shrink-0 border-r border-border-light/50">
                {hasPhoto ? (
                    <img
                        src={item.photos![0]}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-bg-surface-alt flex items-center justify-center">
                        <IconOrEmoji
                            iconValue={item.icon}
                            defaultIcon={getItemIcon()}
                            color={item.color || '#3B82F6'}
                            size="md"
                        />
                    </div>
                )}
            </div>

            {/* Right Side: Content */}
            <div className={`flex flex-col justify-center flex-1 px-4 py-1.5 ${autoWidth ? '' : 'min-w-0'}`}>
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-[16px] font-semibold text-text-primary truncate leading-snug">
                        {item.name}
                    </h3>
                    {item.voiceNoteUrl && (
                        <Mic size={14} className="text-accent-aqua flex-shrink-0" />
                    )}
                </div>

                {location ? (
                    <p className="font-body text-[13px] text-text-secondary truncate">
                        {location}
                    </p>
                ) : (
                    <>
                        {item.tags && item.tags.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 overflow-hidden h-[18px]">
                                {item.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="text-[10px] bg-bg-subtle text-text-secondary px-1.5 py-0 rounded-full font-medium border border-border-light truncate max-w-[80px]">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        ) : showDate ? (
                            <p className="font-body text-[12px] text-text-tertiary">
                                {formatTimeAgo(item.createdAt)}
                            </p>
                        ) : null}
                    </>
                )}
            </div>
        </Card>
    )
}
