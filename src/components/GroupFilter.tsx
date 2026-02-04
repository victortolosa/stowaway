import { useRef } from 'react'
import { useGroups } from '@/hooks/queries/useGroups'
import { cn } from '@/lib/utils'

interface GroupFilterProps {
    type: 'place' | 'container' | 'item'
    selectedGroupId: string | null
    onSelect: (groupId: string | null) => void
    parentId?: string | null
    className?: string
}

export function GroupFilter({
    type,
    selectedGroupId,
    onSelect,
    parentId,
    className
}: GroupFilterProps) {
    const { data: groups = [] } = useGroups()
    const scrollRef = useRef<HTMLDivElement>(null)

    // Filter groups based on type and parentId (if relevant)
    const filteredGroups = groups.filter(g =>
        g.type === type &&
        (parentId === undefined ? true : g.parentId === parentId) // If parentId provided, match it
    )

    // Don't render anything if no groups exist for this context
    if (filteredGroups.length === 0) {
        return null
    }

    return (
        <div
            ref={scrollRef}
            className={cn(
                "flex gap-2 overflow-x-auto no-scrollbar pb-1",
                className
            )}
            style={{
                marginLeft: 'calc(-1 * max(1.5rem, var(--safe-area-inset-left, 0px)))',
                marginRight: 'calc(-1 * max(1.5rem, var(--safe-area-inset-right, 0px)))',
                paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))'
            }}
        >
            <button
                onClick={() => onSelect(null)}
                className={cn(
                    "inline-flex items-center justify-center h-8 rounded-full text-sm font-medium leading-tight transition-all border flex-shrink-0 whitespace-nowrap",
                    selectedGroupId === null
                        ? "bg-text-primary text-white border-text-primary shadow-sm"
                        : "bg-white text-text-secondary border-border-standard hover:border-text-primary/30"
                )}
                style={{ paddingLeft: '12px', paddingRight: '12px' }}
            >
                All
            </button>

            {filteredGroups.map(group => (
                <button
                    key={group.id}
                    onClick={() => onSelect(selectedGroupId === group.id ? null : group.id)} // Allow toggle off
                    className={cn(
                        "inline-flex items-center justify-center h-8 rounded-full text-sm font-medium leading-tight transition-all border flex-shrink-0 whitespace-nowrap",
                        selectedGroupId === group.id
                            ? "bg-text-primary text-white border-text-primary shadow-sm"
                            : "bg-white text-text-secondary border-border-standard hover:border-text-primary/30"
                    )}
                    style={{ paddingLeft: '12px', paddingRight: '12px' }}
                >
                    {group.name}
                </button>
            ))}
        </div>
    )
}
