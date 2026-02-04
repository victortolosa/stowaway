import { useNavigate } from 'react-router-dom'
import { Card, Badge } from '@/components/ui'
import { Package, ChevronRight, Mic } from 'lucide-react'
import { Item, Container } from '@/types'

interface PlaceItemsListProps {
    items: Item[]
    containers: Container[]
    searchQuery: string
}

export function PlaceItemsList({ items, containers, searchQuery }: PlaceItemsListProps) {
    const navigate = useNavigate()

    if (!searchQuery || items.length === 0) return null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="h2 text-text-primary">
                    Items ({items.length})
                </h2>
            </div>
            <div className="flex flex-col gap-3">
                {items.map((item) => (
                    <Card
                        key={item.id}
                        variant="interactive"
                        padding="sm"
                        onClick={() => navigate(`/items/${item.id}`)}
                    >
                        <div className="flex items-center gap-[14px]">
                            {item.photos && item.photos[0] ? (
                                <img
                                    src={item.photos[0]}
                                    alt={item.name}
                                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-bg-elevated rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Package size={28} className="text-text-tertiary" strokeWidth={2} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-body text-[16px] font-semibold text-text-primary truncate">
                                        {item.name}
                                    </h3>
                                    {item.voiceNoteUrl && (
                                        <Mic size={14} className="text-accent-aqua flex-shrink-0" />
                                    )}
                                </div>
                                {/* Show which container it's in */}
                                <p className="font-body text-[13px] text-text-secondary line-clamp-1">
                                    in {containers.find(c => c.id === item.containerId)?.name}
                                </p>
                                {item.tags && item.tags.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                        {item.tags.slice(0, 2).map((tag) => (
                                            <Badge key={tag} variant="success" size="sm">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" strokeWidth={2} />
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
