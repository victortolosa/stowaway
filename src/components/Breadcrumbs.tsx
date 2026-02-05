import { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Home, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useGroupObjects } from '@/hooks/queries/useGroupObjects'
import { useOnClickOutside } from '@/hooks'
import { Place, Container, Item } from '@/types'

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

function GroupDropdown({ groupId, type, currentId }: { groupId: string, type: 'place' | 'container' | 'item', currentId?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0 })
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const { data: objects, isLoading } = useGroupObjects(groupId, type)

    useOnClickOutside(containerRef, () => setIsOpen(false))

    if (!groupId || !type) return null

    const otherObjects = (objects as (Place | Container | Item)[])?.filter(obj => obj.id !== currentId) || []

    if (otherObjects.length === 0 && !isLoading) return null

    const getPath = (id: string) => {
        if (type === 'place') return `/places/${id}`
        if (type === 'container') return `/containers/${id}`
        return `/items/${id}`
    }

    const toggleDropdown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            const dropdownWidth = 224 // w-56 is 14rem = 224px
            const viewportWidth = window.innerWidth
            const padding = 16 // safe margin

            let left = rect.left + window.scrollX

            // If dropdown would overflow right edge, shift it left
            if (left + dropdownWidth > viewportWidth - padding) {
                left = Math.max(padding, viewportWidth - dropdownWidth - padding)
            }

            setCoords({
                top: rect.bottom + window.scrollY,
                left
            })
        }
        setIsOpen(!isOpen)
    }

    return (
        <div className="inline-block">
            <button
                ref={triggerRef}
                onClick={toggleDropdown}
                className={cn(
                    "p-0.5 rounded-md hover:bg-bg-surface transition-colors ml-1",
                    isOpen ? "bg-bg-surface text-text-primary" : "text-text-quaternary"
                )}
            >
                <ChevronDown size={14} strokeWidth={2.5} />
            </button>

            {isOpen && createPortal(
                <div
                    ref={containerRef}
                    style={{
                        position: 'absolute',
                        top: `${coords.top + 8}px`,
                        left: `${coords.left}px`,
                        zIndex: 9999
                    }}
                    className="w-56 bg-white border border-border-standard rounded-xl shadow-xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    <div className="px-3 py-1.5 mb-1 border-b border-border-light flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest font-display">
                            More in Group
                        </span>
                        <Link
                            to={`/groups/${groupId}`}
                            className="text-[10px] font-bold text-accent-aqua hover:underline uppercase tracking-widest font-display"
                            onClick={() => setIsOpen(false)}
                        >
                            View All
                        </Link>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="px-3 py-2 text-xs text-text-tertiary italic">Loading...</div>
                        ) : (
                            otherObjects.map((obj) => (
                                <Link
                                    key={obj.id}
                                    to={getPath(obj.id)}
                                    className="block px-3 py-2 text-[14px] text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {obj.name}
                                </Link>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps & { className?: string }) {
    const scrollContainerRef = useRef<HTMLElement>(null)

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
        <div className={cn("relative mb-8 w-screen left-1/2 -translate-x-1/2 z-20")}>
            {/* Left Gradient Fade - Absolute to breakout container edges */}
            <div className="absolute left-0 top-0 bottom-0 w-[max(1.5rem,var(--safe-area-inset-left,0px))] pointer-events-none bg-gradient-to-r from-bg-page via-bg-page/80 to-transparent z-30" />

            <nav
                ref={scrollContainerRef}
                className={cn(
                    "flex items-center gap-x-2 overflow-x-auto no-scrollbar whitespace-nowrap py-1 scroll-smooth",
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
                    className="flex items-center justify-center hover:text-text-primary transition-colors flex-shrink-0 p-1 text-text-tertiary hover:bg-bg-surface rounded-md z-40 relative"
                    title="Dashboard"
                >
                    <Home size={18} strokeWidth={2} />
                </Link>

                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-x-2 group">
                        <span className="text-text-quaternary/40 flex-shrink-0 font-medium text-sm px-1" aria-hidden="true">/</span>
                        <div className="flex flex-col">
                            {item.category && (
                                item.categoryPath ? (
                                    <Link
                                        to={item.categoryPath}
                                        className="text-[10px] font-bold text-text-tertiary hover:text-text-primary uppercase tracking-widest transition-colors font-display"
                                    >
                                        {item.category}
                                    </Link>
                                ) : (
                                    <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest font-display">
                                        {item.category}
                                    </span>
                                )
                            )}
                            {item.path ? (
                                <div className="flex items-center">
                                    <Link
                                        to={item.path}
                                        className="hover:text-text-primary text-text-secondary transition-colors font-medium text-[15px]"
                                    >
                                        {item.label}
                                    </Link>
                                    {item.groupId && item.type && (
                                        <GroupDropdown
                                            groupId={item.groupId}
                                            type={item.type}
                                            currentId={item.path.split('/').pop()}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <span className="font-bold text-text-primary cursor-default text-[15px]">
                                        {item.label}
                                    </span>
                                    {item.groupId && item.type && (
                                        <GroupDropdown
                                            groupId={item.groupId}
                                            type={item.type}
                                            currentId={window.location.pathname.split('/').pop()}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Right Gradient Fade - Absolute to breakout container edges */}
            <div className="absolute right-0 top-0 bottom-0 w-[max(1.5rem,var(--safe-area-inset-right,0px))] pointer-events-none bg-gradient-to-l from-bg-page via-bg-page/80 to-transparent z-30" />
        </div>
    )
}
