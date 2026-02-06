import { useRef, useEffect } from 'react'
import { Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
    label: string
    path?: string
    category?: string
    categoryPath?: string
    groupId?: string
    type?: 'place' | 'container' | 'item'
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

const LIST_TABS = [
    { category: 'PLACES', path: '/places', label: 'Places' },
    { category: 'CONTAINERS', path: '/containers', label: 'Containers' },
    { category: 'ITEMS', path: '/items', label: 'Items' },
]

export function Breadcrumbs({ items, className }: BreadcrumbsProps & { className?: string }) {
    const scrollContainerRef = useRef<HTMLElement>(null)

    // Determine if any breadcrumb item uses a category tab (Places/Containers/Items hierarchy)
    const hasCategoryTabs = items.some(item => LIST_TABS.some(tab => tab.category === item.category))
    // The active tab is the last (deepest) category in the breadcrumb chain
    const activeCategory = hasCategoryTabs
        ? [...items].reverse().find(item => LIST_TABS.some(tab => tab.category === item.category))?.category
        : null

    // Auto-scroll to the right when items change
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({
                left: scrollContainerRef.current.scrollWidth,
                behavior: 'smooth'
            })
        }
    }, [items])

    return (
        <div className={cn("relative mb-2 w-screen left-1/2 -translate-x-1/2 z-20 bg-bg-surface/60 border-b border-border-light/50 backdrop-blur-md -mt-2")}>
            {/* Left Gradient Fade - Absolute to breakout container edges */}
            <div className="absolute left-0 top-0 bottom-0 w-[max(1.5rem,var(--safe-area-inset-left,0px))] pointer-events-none bg-gradient-to-r from-bg-page via-bg-page/80 to-transparent z-30" />

            <nav
                ref={scrollContainerRef}
                className={cn(
                    "flex items-center overflow-x-auto no-scrollbar whitespace-nowrap py-0.5 scroll-smooth",
                    // Content alignment:
                    // Mobile: standard padding
                    "px-[max(1.5rem,var(--safe-area-inset-left,0px))]",
                    // Desktop: layout padding + centered gutter
                    "md:px-[calc((100vw-1024px)/2+1.5rem)]",
                    className
                )}
                aria-label="Breadcrumb"
            >
                <Link
                    to="/dashboard"
                    className="flex items-center justify-center hover:text-text-primary transition-colors flex-shrink-0 p-1.5 text-text-tertiary hover:bg-bg-surface rounded-md z-40 relative"
                    title="Dashboard"
                >
                    <Home size={18} strokeWidth={2} />
                </Link>

                {hasCategoryTabs ? (
                    <>
                        <span className="text-border-light flex-shrink-0 font-medium text-sm px-1.5" aria-hidden="true">/</span>
                        <div className="flex items-center">
                            {LIST_TABS.map((tab, index) => {
                                const matchingItem = items.find(item => item.category === tab.category)
                                const isGenericList = matchingItem && (
                                    matchingItem.label.startsWith('All ') || matchingItem.label === '...'
                                )
                                const hasEntity = matchingItem && !isGenericList
                                const displayLabel = hasEntity ? matchingItem.label : tab.label
                                const categoryLink = matchingItem?.categoryPath || tab.path
                                const entityLink = matchingItem?.path || categoryLink
                                const linkTo = hasEntity ? entityLink : categoryLink
                                const isActive = tab.category === activeCategory

                                return (
                                    <div key={tab.category} className="flex items-center">
                                        {index > 0 && (
                                            <span className="text-border-light flex-shrink-0 font-medium text-sm px-1.5" aria-hidden="true">/</span>
                                        )}

                                        {!hasEntity && !isActive ? (
                                            <Link
                                                to={linkTo}
                                                className="px-1.5 py-0.5 rounded-lg text-[13px] font-semibold font-display text-border-light hover:text-text-secondary hover:bg-bg-surface transition-colors"
                                            >
                                                {displayLabel}
                                            </Link>
                                        ) : (
                                            <Link
                                                to={linkTo}
                                                className={cn(
                                                    "px-1.5 py-0.5 rounded-lg text-[13px] font-semibold transition-colors font-display",
                                                    isActive
                                                        ? "bg-accent-aqua/10 text-accent-aqua"
                                                        : "text-text-tertiary hover:text-text-secondary hover:bg-bg-surface"
                                                )}
                                            >
                                                {displayLabel}
                                            </Link>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </>
                ) : (
                    items.map((item, index) => (
                        <div key={index} className="flex items-center group">
                            <span className="text-border-light flex-shrink-0 font-medium text-sm px-1.5" aria-hidden="true">/</span>
                            <span className="font-bold text-text-primary cursor-default text-[14px] px-1.5">
                                {item.label}
                            </span>
                        </div>
                    ))
                )}
            </nav>

            {/* Right Gradient Fade - Absolute to breakout container edges */}
            <div className="absolute right-0 top-0 bottom-0 w-[max(1.5rem,var(--safe-area-inset-right,0px))] pointer-events-none bg-gradient-to-l from-bg-page via-bg-page/80 to-transparent z-30" />
        </div>
    )
}
