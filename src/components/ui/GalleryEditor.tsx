import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
    Image as ImageIcon,
    Star,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Pencil,
    Check
} from 'lucide-react'

interface GalleryEditorProps {
    images: string[]
    onUpdate: (newImages: string[]) => void
    className?: string
}

export function GalleryEditor({
    images = [],
    onUpdate,
    className
}: GalleryEditorProps) {
    const [isEditing, setIsEditing] = useState(false)
    // Local state removed as we are relying on parent update for now
    // const [localImages, setLocalImages] = useState(images)

    // Sync local state when prop changes, but only if not editing to avoid jumps
    // Actually, usually beneficial to always sync unless we want a "save" step.
    // For now, let's assume immediate updates to parent or a save step. 
    // To make it smooth, let's update parent immediately on change.

    const handleMove = (index: number, direction: 'left' | 'right') => {
        const newImages = [...images]
        const targetIndex = direction === 'left' ? index - 1 : index + 1

        if (targetIndex < 0 || targetIndex >= newImages.length) return

        const temp = newImages[index]
        newImages[index] = newImages[targetIndex]
        newImages[targetIndex] = temp

        onUpdate(newImages)
    }

    const handleMakeCover = (index: number) => {
        if (index === 0) return
        const newImages = [...images]
        const [movedImage] = newImages.splice(index, 1)
        newImages.unshift(movedImage)
        onUpdate(newImages)
    }

    const handleDelete = (index: number) => {
        if (confirm('Are you sure you want to remove this photo?')) {
            const newImages = images.filter((_, i) => i !== index)
            onUpdate(newImages)
        }
    }

    if (!images || images.length === 0) {
        return (
            <div className={cn("w-full aspect-video bg-bg-surface flex items-center justify-center text-text-tertiary rounded-xl border-2 border-dashed border-border-light", className)}>
                <div className="flex flex-col items-center gap-2">
                    <ImageIcon size={32} className="opacity-20" />
                    <span className="text-xs">No photos available</span>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">
                    {images.length} Photo{images.length !== 1 && 's'}
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    className={isEditing ? "text-accent-aqua bg-accent-aqua/10" : "text-text-secondary"}
                    onClick={() => setIsEditing(!isEditing)}
                    leftIcon={isEditing ? Check : Pencil}
                >
                    {isEditing ? 'Done' : 'Edit Gallery'}
                </Button>
            </div>

            <motion.div
                layout
                className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
                <AnimatePresence>
                    {images.map((src, index) => (
                        <motion.div
                            layout
                            key={src} // Assumes URLs are unique. If not, problematic.
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                "relative aspect-square rounded-xl overflow-hidden group bg-bg-surface",
                                index === 0 && "ring-2 ring-accent-yellow ring-offset-2",
                                isEditing && "ring-1 ring-border-standard"
                            )}
                        >
                            <img
                                src={src}
                                alt={`Gallery item ${index + 1}`}
                                className="w-full h-full object-cover"
                            />

                            {/* Cover Label (Always visible for index 0) */}
                            {index === 0 && (
                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent-yellow text-white text-[10px] font-bold rounded-full shadow-sm z-10 flex items-center gap-1">
                                    <Star size={8} fill="currentColor" />
                                    COVER
                                </div>
                            )}

                            {/* Edit Controls Overlay */}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 gap-2 animate-in fade-in duration-200">

                                    {/* Top Row Actions */}
                                    <div className="w-full flex justify-between items-start absolute top-2 px-2">
                                        {index !== 0 ? (
                                            <button
                                                onClick={() => handleMakeCover(index)}
                                                className="p-1.5 bg-white/20 hover:bg-accent-yellow/90 hover:text-white rounded-full text-white transition-colors"
                                                title="Make Cover"
                                            >
                                                <Star size={14} />
                                            </button>
                                        ) : <div />} {/* Spacer */}

                                        <button
                                            onClick={() => handleDelete(index)}
                                            className="p-1.5 bg-white/20 hover:bg-red-500 rounded-full text-white transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {/* Reorder Controls */}
                                    <div className="flex items-center gap-3 mt-4">
                                        <button
                                            onClick={() => handleMove(index, 'left')}
                                            disabled={index === 0}
                                            className="p-2 bg-white rounded-full text-text-primary shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleMove(index, 'right')}
                                            disabled={index === images.length - 1}
                                            className="p-2 bg-white rounded-full text-text-primary shadow-lg disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
