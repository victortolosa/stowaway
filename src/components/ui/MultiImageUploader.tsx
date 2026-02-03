import { type ChangeEvent } from 'react'
import { Camera, Image as ImageIcon, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MultiImageUploaderProps {
    value: (string | File)[]
    onChange: (files: (string | File)[]) => void
    label?: string
    className?: string
    maxImages?: number
}

export function MultiImageUploader({
    value = [],
    onChange,
    label = 'Photo',
    className,
    maxImages = 10,
}: MultiImageUploaderProps) {

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            // Check if adding these would exceed maxImages
            const availableSlots = maxImages - value.length
            const filesToAdd = newFiles.slice(0, availableSlots)

            if (filesToAdd.length > 0) {
                onChange([...value, ...filesToAdd])
            }
        }
        // Reset input
        e.target.value = ''
    }

    const handleRemove = (index: number) => {
        const newValue = [...value]
        newValue.splice(index, 1)
        onChange(newValue)
    }

    const getPreviewUrl = (item: string | File) => {
        if (typeof item === 'string') {
            return item
        }
        return URL.createObjectURL(item)
    }

    const isMaxReached = value.length >= maxImages

    return (
        <div className={cn('w-full space-y-3', className)}>
            {/* Grid of existing images */}
            {value.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {value.map((item, index) => (
                        <div key={index} className="relative aspect-square group">
                            <img
                                src={getPreviewUrl(item)}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-full object-cover rounded-xl border border-border-light"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}

                    {/* Add button in grid if we have images but not maxed out */}
                    {!isMaxReached && (
                        <label className="aspect-square cursor-pointer flex flex-col items-center justify-center bg-bg-surface rounded-xl border-2 border-dashed border-text-tertiary/30 hover:border-accent-aqua/50 transition">
                            <Plus size={24} className="text-text-tertiary" />
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </label>
                    )}
                </div>
            )}

            {/* Initial Empty State Buttons (only if no images) */}
            {value.length === 0 && (
                <div className="flex gap-3">
                    <label className="flex-1 cursor-pointer">
                        <div className="h-24 bg-bg-surface rounded-button border-2 border-dashed border-text-tertiary/30 hover:border-accent-aqua/50 transition flex flex-col items-center justify-center gap-2">
                            <Camera size={24} className="text-text-tertiary" />
                            <span className="font-body text-[13px] text-text-secondary">Take {label}</span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                                // Camera capture usually returns one file, but just in case
                                handleFileSelect(e)
                            }}
                        />
                    </label>

                    <label className="flex-1 cursor-pointer">
                        <div className="h-24 bg-bg-surface rounded-button border-2 border-dashed border-text-tertiary/30 hover:border-accent-aqua/50 transition flex flex-col items-center justify-center gap-2">
                            <ImageIcon size={24} className="text-text-tertiary" />
                            <span className="font-body text-[13px] text-text-secondary">Upload {label}</span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </label>
                </div>
            )}

            <div className="flex justify-between text-xs text-text-tertiary px-1">
                <span>{value.length} / {maxImages} images</span>
            </div>
        </div>
    )
}
