import { type ChangeEvent } from 'react'
import { Camera, Image as ImageIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ImageUploaderProps {
  preview?: string | null
  onFileSelect: (e: ChangeEvent<HTMLInputElement>) => void
  onRemove: () => void
  label?: string
  className?: string
}

export function ImageUploader({
  preview,
  onFileSelect,
  onRemove,
  label = 'Photo',
  className,
}: ImageUploaderProps) {
  return (
    <div className={cn('w-full', className)}>
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-card"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
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
              onChange={onFileSelect}
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
              className="hidden"
              onChange={onFileSelect}
            />
          </label>
        </div>
      )}
    </div>
  )
}
