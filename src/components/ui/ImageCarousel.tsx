import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Image as ImageIcon } from 'lucide-react'

interface ImageCarouselProps {
    images: string[]
    alt?: string
    className?: string
    onImageClick?: (index: number) => void
}

export function ImageCarousel({
    images = [],
    alt = 'Image',
    className,
    onImageClick,
}: ImageCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Handle scroll events to update active index
    useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        const handleScroll = () => {
            const scrollPosition = element.scrollLeft
            const width = element.offsetWidth
            const newIndex = Math.round(scrollPosition / width)
            setActiveIndex(newIndex)
        }

        element.addEventListener('scroll', handleScroll)
        return () => element.removeEventListener('scroll', handleScroll)
    }, [])

    if (!images || images.length === 0) {
        return (
            <div className={cn("w-full aspect-[4/3] bg-bg-surface flex items-center justify-center text-text-tertiary", className)}>
                <ImageIcon size={48} className="opacity-20" />
            </div>
        )
    }

    return (
        <div className={cn("relative group w-full", className)}>
            {/* Scroll Container */}
            <div
                ref={scrollRef}
                className="w-full h-full overflow-x-auto snap-x snap-mandatory flex scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {images.map((src, index) => (
                    <div
                        key={index}
                        className="flex-shrink-0 w-full h-full snap-center relative cursor-pointer"
                        onClick={() => onImageClick?.(index)}
                    >
                        <img
                            src={src}
                            alt={`${alt} ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading={index === 0 ? 'eager' : 'lazy'}
                        />
                    </div>
                ))}
            </div>

            {/* Pagination Indicators */}
            {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {images.map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                "w-1.5 h-1.5 rounded-full transition-all duration-300 shadow-sm backdrop-blur-sm",
                                index === activeIndex
                                    ? "bg-white w-3"
                                    : "bg-white/50"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Count Badge (Optional, alternative to dots for many images) */}
            {images.length > 5 && (
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full z-10 font-medium">
                    {activeIndex + 1} / {images.length}
                </div>
            )}
        </div>
    )
}
