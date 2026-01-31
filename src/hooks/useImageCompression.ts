import { useState } from 'react'
import imageCompression from 'browser-image-compression'

interface CompressionOptions {
    maxSizeMB?: number
    maxWidthOrHeight?: number
    useWebWorker?: boolean
}

interface UseImageCompressionReturn {
    compress: (file: File, options?: CompressionOptions) => Promise<File>
    isCompressing: boolean
    progress: number
}

/**
 * Hook for compressing images before upload
 * Uses browser-image-compression with configurable options
 */
export function useImageCompression(): UseImageCompressionReturn {
    const [isCompressing, setIsCompressing] = useState(false)
    const [progress, setProgress] = useState(0)

    const compress = async (
        file: File,
        options: CompressionOptions = {}
    ): Promise<File> => {
        const {
            maxSizeMB = 1,
            maxWidthOrHeight = 1920,
            useWebWorker = true,
        } = options

        setIsCompressing(true)
        setProgress(0)

        try {
            const compressedFile = await imageCompression(file, {
                maxSizeMB,
                maxWidthOrHeight,
                useWebWorker,
                onProgress: (progressPercent) => {
                    setProgress(progressPercent)
                },
            })

            setProgress(100)
            return compressedFile
        } catch (error) {
            console.error('Error compressing image:', error)
            throw error
        } finally {
            setIsCompressing(false)
            // Reset progress after a short delay
            setTimeout(() => setProgress(0), 500)
        }
    }

    return {
        compress,
        isCompressing,
        progress,
    }
}
