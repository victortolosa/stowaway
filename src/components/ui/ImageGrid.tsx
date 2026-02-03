import { cn } from '@/lib/utils'
import { Image as ImageIcon } from 'lucide-react'

interface ImageGridProps {
    images: string[]
    alt?: string
    className?: string
    onImageClick?: (index: number) => void
}

export function ImageGrid({
    images = [],
    alt = 'Image',
    className,
    onImageClick,
}: ImageGridProps) {
    if (!images || images.length === 0) {
        return (
            <div className={cn("w-full aspect-square bg-bg-surface flex items-center justify-center text-text-tertiary rounded-xl", className)}>
                <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={32} className="opacity-20" />
                    <span className="text-xs">No photos</span>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-2", className)}>
            {images.map((src, index) => (
                <div
                    key={index}
                    className="relative aspect-square cursor-pointer group overflow-hidden rounded-xl bg-bg-surface"
                    onClick={() => onImageClick?.(index)}
                >
                    <img
                        src={src}
                        alt={`${alt} ${index + 1}`}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition duration-300" />
                </div>
            ))}
        </div>
    )
}
