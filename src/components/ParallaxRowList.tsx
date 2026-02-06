import { useRef, useMemo } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

interface ParallaxRowListProps<T> {
    items: T[]
    renderItem: (item: T) => React.ReactNode
    numRows?: number
    className?: string
    onSeeAll?: () => void
    seeAllLabel?: string
    getItemWidth?: (item: T) => number
}

export function ParallaxRowList<T extends { id: string }>({
    items,
    renderItem,
    getItemWidth,
    numRows = 2,
    className = "",
    onSeeAll,
    seeAllLabel = "SEE ALL"
}: ParallaxRowListProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null)
    const { scrollX } = useScroll({ container: containerRef })

    // Create rows
    const rows = useMemo(() => {
        if (!getItemWidth) {
            return Array.from({ length: numRows }, (_, rowIndex) =>
                items.filter((_, i) => i % numRows === rowIndex)
            )
        }

        const rowData = Array.from({ length: numRows }, () => ({ items: [] as T[], width: 0 }))

        items.forEach(item => {
            // Find row with min width
            const minRow = rowData.reduce((prev, curr) => prev.width < curr.width ? prev : curr)
            minRow.items.push(item)
            minRow.width += getItemWidth(item)
        })

        return rowData.map(r => r.items)
    }, [items, numRows, getItemWidth])

    // Calculate parallax transforms
    // Row 0 moves normally (0 offset relative to scroll) - but we want it to stay put relative to scroll container?
    // Actually, "parallax" means background moves slower.
    // If we want the rows to move at different speeds *while scrolling*, we transform them.
    // transform x positive moves it RIGHT, opposing the LEFT scroll.
    // So if we scroll 100px right, content moves 100px left.
    // To make it move *slower*, we push it right slightly.
    // Row 0: No transform (1:1 with scroll)
    // Row 1: Move right by 15% of scroll (effectively moves left 85% speed)
    // Row 2: Move right by 25% of scroll (effectively moves left 75% speed)

    const x1 = useTransform(scrollX, value => value * 0.05)
    const x2 = useTransform(scrollX, value => value * 0.1)

    const getRowStyle = (rowIndex: number) => {
        if (rowIndex === 0) return {}
        if (rowIndex === 1) return { x: x1 }
        if (rowIndex === 2) return { x: x2 }
        return {}
    }

    return (
        <div
            ref={containerRef}
            className={`overflow-x-auto pb-8 no-scrollbar w-full ${className}`}
            style={{
                width: 'calc(100% + max(1.5rem, var(--safe-area-inset-left, 0px)) + max(1.5rem, var(--safe-area-inset-right, 0px)))',
                marginLeft: 'calc(-1 * max(1.5rem, var(--safe-area-inset-left, 0px)))',
                marginRight: 'calc(-1 * max(1.5rem, var(--safe-area-inset-right, 0px)))',
                paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))'
            }}
        >
            <div className="flex items-center gap-4 min-w-max">
                <div className="flex flex-col gap-3">
                    {rows.map((rowItems, rowIndex) => (
                        <motion.div
                            key={rowIndex}
                            className="flex gap-4"
                            style={getRowStyle(rowIndex)}
                        >
                            {rowItems.map((item) => (
                                <div key={item.id}>
                                    {renderItem(item)}
                                </div>
                            ))}
                        </motion.div>
                    ))}
                </div>

                {/* See All Button - Centered vertically relative to the group */}
                {items.length > 0 && onSeeAll && (
                    <button
                        onClick={onSeeAll}
                        className="h-[44px] px-6 mr-6 rounded-full bg-bg-surface border border-border-standard hover:border-accent-aqua hover:bg-accent-aqua/5 transition-all flex items-center justify-center group whitespace-nowrap"
                    >
                        <span className="font-display text-[14px] font-bold text-text-secondary group-hover:text-accent-aqua tracking-wide">
                            {seeAllLabel}
                        </span>
                    </button>
                )}
            </div>
        </div >
    )
}
