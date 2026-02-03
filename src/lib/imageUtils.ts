
/**
 * Helper function to create an HTMLImageElement from a URL
 */
export function createImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.onload = () => resolve(image)
        image.onerror = (err) => reject(err)
        image.src = url
    })
}

/**
 * Returns rotation degrees and flip flags for common EXIF orientations
 */
export function orientationToTransform(orientation: number) {
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

/**
 * Reads EXIF orientation from a file
 */
export async function getExifOrientation(file: File): Promise<number> {
    try {
        const buffer = await file.arrayBuffer()
        return parseExifOrientation(buffer)
    } catch {
        return 1
    }
}

/**
 * Fixes image orientation based on EXIF data.
 * Returns a new File object with the corrected orientation.
 */
export async function fixImageOrientation(file: File): Promise<File> {
    const orientation = await getExifOrientation(file)

    // If orientation is normal, return original file
    if (orientation === 1) {
        return file
    }

    const { rotationDeg, flipH, flipV } = orientationToTransform(orientation)
    const src = URL.createObjectURL(file)

    try {
        const image = await createImage(src)
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
            throw new Error('Failed to get canvas context')
        }

        const width = image.width
        const height = image.height

        // If rotation is 90 or 270, swap canvas dims
        if (rotationDeg === 90 || rotationDeg === 270) {
            canvas.width = height
            canvas.height = width
        } else {
            canvas.width = width
            canvas.height = height
        }

        // Draw to canvas with transforms
        ctx.translate(canvas.width / 2, canvas.height / 2)
        if (rotationDeg) ctx.rotate((rotationDeg * Math.PI) / 180)
        if (flipH) ctx.scale(-1, 1)
        if (flipV) ctx.scale(1, -1)

        ctx.drawImage(
            image,
            -width / 2,
            -height / 2,
            width,
            height
        )

        // Convert back to blob/file
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Failed to create blob from canvas'))
                    return
                }
                const newFile = new File([blob], file.name, {
                    type: file.type,
                    lastModified: Date.now(),
                })
                resolve(newFile)
            }, file.type, 0.95) // High quality
        })
    } finally {
        URL.revokeObjectURL(src)
    }
}
