import { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { Crop, RotateCw, X, Check, Loader2 } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'

interface ImageCropperProps {
    imageSrc: string
    onComplete: (croppedBlob: Blob) => void
    onCancel: () => void
    aspectRatio?: number
}

/**
 * Image cropper component with zoom and rotate controls
 * Prevents upscaling beyond original image dimensions
 */
export function ImageCropper({
    imageSrc,
    onComplete,
    onCancel,
    aspectRatio = 4 / 3,
}: ImageCropperProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleRotate = () => {
        setRotation((prev) => (prev + 90) % 360)
    }

    const createCroppedImage = async () => {
        if (!croppedAreaPixels) return

        setIsProcessing(true)
        try {
            const image = await createImage(imageSrc)
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')

            if (!ctx) {
                throw new Error('Failed to get canvas context')
            }

            // Use the exact crop dimensions to avoid forcing square crops (preserve aspect)
            let outputWidth = Math.max(1, Math.round(croppedAreaPixels.width))
            let outputHeight = Math.max(1, Math.round(croppedAreaPixels.height))

            // Prevent upscaling: clamp output to image natural size
            const scaleX = image.width / croppedAreaPixels.width
            const scaleY = image.height / croppedAreaPixels.height
            const downscale = Math.min(1, scaleX, scaleY)
            outputWidth = Math.round(outputWidth * downscale)
            outputHeight = Math.round(outputHeight * downscale)

            // Read EXIF orientation (if available) and combine with user rotation
            const exifOrientation = await getExifOrientation(imageSrc)
            const { rotationDeg: exifRotationDeg, flipH, flipV } = orientationToTransform(exifOrientation)

            const netRotation = ((rotation + exifRotationDeg) % 360 + 360) % 360

            // If rotation is 90 or 270, swap canvas dims so rotated image fits
            const needSwap = netRotation === 90 || netRotation === 270
            canvas.width = needSwap ? outputHeight : outputWidth
            canvas.height = needSwap ? outputWidth : outputHeight

            // Center + rotate + flip as needed
            ctx.save()
            ctx.translate(canvas.width / 2, canvas.height / 2)
            if (netRotation) ctx.rotate((netRotation * Math.PI) / 180)
            ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)

            // Draw the cropped area centered on canvas
            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                -croppedAreaPixels.width / 2,
                -croppedAreaPixels.height / 2,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            )
            ctx.restore()

            // Convert to blob
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        onComplete(blob)
                    }
                    setIsProcessing(false)
                },
                'image/jpeg',
                0.95
            )
        } catch (error) {
            console.error('Error creating cropped image:', error)
            setIsProcessing(false)
        }
    }

    return (
        <Dialog.Root open={true} onOpenChange={(open) => !open && onCancel()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/90 z-[60] backdrop-blur-sm" />
                <Dialog.Content className="fixed inset-0 z-[70] flex flex-col focus:outline-none overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="flex flex-col h-full"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-md border-b border-white/10">
                            <h2 className="text-white font-medium">Crop Photo</h2>
                            <button
                                onClick={onCancel}
                                className="p-2 text-white/70 hover:text-white transition rounded-full hover:bg-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Cropper Area */}
                        <div className="relative flex-1 bg-black">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                rotation={rotation}
                                aspect={aspectRatio}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                style={{
                                    containerStyle: {
                                        backgroundColor: '#000',
                                    },
                                    cropAreaStyle: {
                                        border: '2px solid white',
                                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                                    },
                                }}
                            />
                        </div>

                        {/* Controls Container */}
                        <div className="p-6 pb-safe-area bg-bg-page border-t border-text-tertiary/10 space-y-6">
                            {/* Zoom Slider */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-text-secondary">
                                        <Crop size={16} />
                                        <span className="text-sm font-medium">Zoom</span>
                                    </div>
                                    <span className="text-text-secondary text-xs font-mono">
                                        {Math.round(zoom * 100)}%
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                                        className="text-text-tertiary hover:text-accent-aqua transition"
                                    >
                                        <span className="text-xl font-bold">−</span>
                                    </button>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        step={0.01}
                                        value={zoom}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="flex-1 h-1.5 bg-bg-surface rounded-full appearance-none cursor-pointer accent-accent-aqua"
                                    />
                                    <button
                                        onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                                        className="text-text-tertiary hover:text-accent-aqua transition"
                                    >
                                        <span className="text-xl font-bold">+</span>
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleRotate}
                                    className="flex items-center justify-center h-12 w-12 bg-bg-surface border border-text-tertiary/10 rounded-xl active:bg-bg-elevated transition shadow-sm"
                                    disabled={isProcessing}
                                    title="Rotate"
                                >
                                    <RotateCw size={20} className="text-text-primary" />
                                </button>

                                <button
                                    onClick={createCroppedImage}
                                    disabled={isProcessing}
                                    className="flex-1 h-12 bg-accent-aqua rounded-xl flex items-center justify-center gap-2 text-text-primary font-bold shadow-lg shadow-accent-aqua/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check size={20} />
                                            <span>Apply Crop</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}

// Helper function to create image from URL
// Helper: create Image element from url/dataURL
function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        // Important for cross-origin data handling (data URLs are fine)
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = (err) => reject(err)
        image.src = url
    })
}

// Read EXIF orientation from an image URL (supports data URLs and fetchable URLs)
async function getExifOrientation(url: string): Promise<number> {
    try {
        const res = await fetch(url)
        const buffer = await res.arrayBuffer()
        return parseExifOrientation(buffer)
    } catch (err) {
        return 1 // default - no rotation
    }
}

function parseExifOrientation(arrayBuffer: ArrayBuffer): number {
    const view = new DataView(arrayBuffer)
    // JPEG check
    if (view.getUint16(0) !== 0xffd8) return 1

    let offset = 2
    const length = view.byteLength
    while (offset < length) {
        const marker = view.getUint16(offset)
        offset += 2
        if (marker === 0xffe1) {
            // APP1 segment - Exif
            // const exifLength = view.getUint16(offset)
            offset += 2
            // Check for 'Exif' string
            if (
                view.getUint8(offset) === 0x45 &&
                view.getUint8(offset + 1) === 0x78 &&
                view.getUint8(offset + 2) === 0x69 &&
                view.getUint8(offset + 3) === 0x66
            ) {
                offset += 6 // Skip "Exif\0\0"

                const little = view.getUint16(offset) === 0x4949
                offset += 2
                // const tagMark = little ? view.getUint16(offset, true) : view.getUint16(offset)
                offset += 2
                const firstIFDOffset = little ? view.getUint32(offset, true) : view.getUint32(offset)
                offset += firstIFDOffset - 4

                const entries = little ? view.getUint16(offset, true) : view.getUint16(offset)
                offset += 2
                for (let i = 0; i < entries; i++) {
                    const entryOffset = offset + i * 12
                    const tag = little ? view.getUint16(entryOffset, true) : view.getUint16(entryOffset)
                    if (tag === 0x0112) {
                        const valueOffset = entryOffset + 8
                        const orientation = little ? view.getUint16(valueOffset, true) : view.getUint16(valueOffset)
                        return orientation
                    }
                }
            }
        } else if ((marker & 0xff00) !== 0xff00) {
            break
        } else {
            const size = view.getUint16(offset)
            offset += size
        }
    }
    return 1
}

function orientationToTransform(orientation: number) {
    // Returns rotation degrees and flip flags for common EXIF orientations
    switch (orientation) {
        case 2:
            return { rotationDeg: 0, flipH: true, flipV: false }
        case 3:
            return { rotationDeg: 180, flipH: false, flipV: false }
        case 4:
            return { rotationDeg: 180, flipH: true, flipV: false }
        case 5:
            return { rotationDeg: 90, flipH: true, flipV: false }
        case 6:
            return { rotationDeg: 90, flipH: false, flipV: false }
        case 7:
            return { rotationDeg: 270, flipH: true, flipV: false }
        case 8:
            return { rotationDeg: 270, flipH: false, flipV: false }
        default:
            return { rotationDeg: 0, flipH: false, flipV: false }
    }
}
