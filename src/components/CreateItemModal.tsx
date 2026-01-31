import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence } from 'framer-motion'
import { X, Camera, Image as ImageIcon, Mic } from 'lucide-react'
import { createItem, updateItem, uploadImage, uploadAudio, deleteStorageFile } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { useImageCompression } from '@/hooks'
import { ImageCropper, AudioRecorder, AudioPlayer } from '@/components'
import { Item } from '@/types'

const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface CreateItemModalProps {
    isOpen: boolean
    onClose: () => void
    onItemCreated: () => void
    containerId: string
    editMode?: boolean
    initialData?: Item
}

export function CreateItemModal({
    isOpen,
    onClose,
    onItemCreated,
    containerId,
    editMode = false,
    initialData
}: CreateItemModalProps) {
    const user = useAuthStore((state) => state.user)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [showCropper, setShowCropper] = useState(false)
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
    const [showAudioRecorder, setShowAudioRecorder] = useState(false)

    const { compress, isCompressing, progress } = useImageCompression()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
    })

    // Pre-fill form when editing
    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
                description: initialData.description || '',
            })
            setPhotoFile(null)
            setPhotoPreview(initialData.photos[0] || null)
            setAudioBlob(null)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
        } else if (isOpen && !editMode) {
            reset({
                name: '',
                description: '',
            })
            setPhotoFile(null)
            setPhotoPreview(null)
            setAudioBlob(null)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
        }
    }, [isOpen, editMode, initialData, reset])

    // Cleanup audio preview URL on unmount
    useEffect(() => {
        return () => {
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
        }
    }, [audioPreviewUrl])

    const onSubmit = async (data: ItemFormValues) => {
        if (!user) return

        setIsSubmitting(true)
        const uploadedPaths: string[] = []
        try {
            let photoUrl = ''
            let audioUrl = ''

            // Upload photo if present
            if (photoFile) {
                const compressedPhoto = await compress(photoFile, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                })

                const ext = compressedPhoto.type.split('/')[1] || 'jpg'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const photoPath = `items/${user.uid}/${filename}`
                photoUrl = await uploadImage(compressedPhoto, photoPath)
                uploadedPaths.push(photoPath)
            }

            // Upload audio if present
            if (audioBlob) {
                const ext = (audioBlob.type && audioBlob.type.split('/')[1]) || 'webm'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const audioFile = new File([audioBlob], filename, {
                    type: audioBlob.type || 'audio/webm',
                })
                const audioPath = `items/${user.uid}/audio/${filename}`
                audioUrl = await uploadAudio(audioFile, audioPath)
                uploadedPaths.push(audioPath)
            }

            // Now save the item with both URLs
            const itemData = {
                ...data,
                ...(photoUrl && { photos: [photoUrl] }),
                ...(audioUrl && { voiceNoteUrl: audioUrl }),
            }

            if (editMode && initialData) {
                await updateItem(initialData.id, {
                    ...itemData,
                    photos: photoUrl ? [photoUrl] : initialData.photos,
                })
            } else {
                await createItem({
                    ...itemData,
                    containerId,
                    photos: photoUrl ? [photoUrl] : [],
                    tags: [],
                } as any)
            }

            reset()
            setPhotoFile(null)
            setPhotoPreview(null)
            setAudioBlob(null)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
            onItemCreated()
            onClose()
        } catch (error) {
            console.error('Failed to save item:', error)
            // Attempt to cleanup any uploaded files
            try {
                if (uploadedPaths.length > 0) {
                    await Promise.all(uploadedPaths.map((p: string) => deleteStorageFile(p)))
                }
            } catch (cleanupErr) {
                console.error('Failed to cleanup uploaded files after item save failure:', cleanupErr)
            }
            alert('Failed to save item. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const reader = new FileReader()

            reader.onload = () => {
                setImageToCrop(reader.result as string)
                setShowCropper(true)
            }

            reader.readAsDataURL(file)
        }
    }

    const handleCropComplete = async (croppedBlob: Blob) => {
        // Convert blob to file
        const file = new File([croppedBlob], `cropped_${Date.now()}.jpg`, {
            type: 'image/jpeg',
        })

        setPhotoFile(file)

        // Create preview URL
        const previewUrl = URL.createObjectURL(croppedBlob)
        setPhotoPreview(previewUrl)

        setShowCropper(false)
        setImageToCrop(null)
    }

    const handleCropCancel = () => {
        setShowCropper(false)
        setImageToCrop(null)
    }

    const removePhoto = () => {
        setPhotoFile(null)
        setPhotoPreview(null)
    }

    return (
        <>
            <Dialog.Root open={isOpen} onOpenChange={onClose}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bg-page rounded-card shadow-lg p-6 z-50 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <Dialog.Title className="font-display text-[22px] font-bold text-text-primary">
                                {editMode ? 'Edit Item' : 'Add New Item'}
                            </Dialog.Title>
                            <Dialog.Close className="text-text-secondary hover:text-text-primary transition">
                                <X size={24} />
                            </Dialog.Close>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div>
                                <label htmlFor="name" className="block font-body text-[14px] font-medium text-text-primary mb-2">
                                    Item Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    className="w-full px-4 py-3 bg-bg-surface border-0 rounded-button font-body text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-pink"
                                    placeholder="e.g., Vintage Lamp"
                                    {...register('name')}
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-[13px] mt-1.5">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="description" className="block font-body text-[14px] font-medium text-text-primary mb-2">
                                    Description (Optional)
                                </label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-bg-surface border-0 rounded-button font-body text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-pink resize-none"
                                    placeholder="Details about the item..."
                                    {...register('description')}
                                />
                            </div>

                            <div>
                                <label className="block font-body text-[14px] font-medium text-text-primary mb-2">
                                    Photo
                                </label>

                                {photoPreview ? (
                                    <div className="relative">
                                        <img
                                            src={photoPreview}
                                            alt="Preview"
                                            className="w-full h-48 object-cover rounded-card"
                                        />
                                        <button
                                            type="button"
                                            onClick={removePhoto}
                                            className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-3">
                                        <label className="flex-1 cursor-pointer">
                                            <div className="h-24 bg-bg-surface rounded-button border-2 border-dashed border-text-tertiary/30 hover:border-accent-pink/50 transition flex flex-col items-center justify-center gap-2">
                                                <Camera size={24} className="text-text-tertiary" />
                                                <span className="font-body text-[13px] text-text-secondary">Take Photo</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>

                                        <label className="flex-1 cursor-pointer">
                                            <div className="h-24 bg-bg-surface rounded-button border-2 border-dashed border-text-tertiary/30 hover:border-accent-pink/50 transition flex flex-col items-center justify-center gap-2">
                                                <ImageIcon size={24} className="text-text-tertiary" />
                                                <span className="font-body text-[13px] text-text-secondary">Upload Photo</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                            />
                                        </label>
                                    </div>
                                )}

                                {isCompressing && (
                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-body text-[13px] text-text-secondary">Compressing image...</span>
                                            <span className="font-body text-[13px] text-text-secondary">{progress}%</span>
                                        </div>
                                        <div className="h-1.5 bg-bg-surface rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent-pink transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Voice Note Section */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block font-body text-[14px] font-medium text-text-primary">
                                        Voice Note (Optional)
                                    </label>
                                    {!showAudioRecorder && !audioBlob && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAudioRecorder(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-surface rounded-button font-body text-[13px] text-text-secondary hover:text-accent-pink transition"
                                        >
                                            <Mic size={14} />
                                            <span>Add Voice Note</span>
                                        </button>
                                    )}
                                </div>

                                {showAudioRecorder && !audioBlob && (
                                    <AudioRecorder
                                        onRecordingComplete={(blob) => {
                                            setAudioBlob(blob)
                                            const url = URL.createObjectURL(blob)
                                            setAudioPreviewUrl(url)
                                            setShowAudioRecorder(false)
                                        }}
                                        maxDuration={60}
                                    />
                                )}

                                {audioBlob && audioPreviewUrl && (
                                    <div className="relative">
                                        <AudioPlayer
                                            audioUrl={audioPreviewUrl}
                                            className="border border-border-light"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAudioBlob(null)
                                                if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
                                                setAudioPreviewUrl(null)
                                                setShowAudioRecorder(false)
                                            }}
                                            className="absolute -top-2 -right-2 w-7 h-7 bg-bg-elevated rounded-full shadow-sm flex items-center justify-center text-text-secondary hover:text-text-primary transition border border-border-light z-10"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-5 py-2.5 font-body text-[14px] font-medium text-text-primary bg-bg-surface rounded-button hover:bg-bg-elevated transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || isCompressing}
                                    className="px-5 py-2.5 font-body text-[14px] font-medium text-white bg-accent-pink rounded-button hover:opacity-90 transition disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Item')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Image Cropper Modal */}
            <AnimatePresence>
                {showCropper && imageToCrop && (
                    <ImageCropper
                        imageSrc={imageToCrop}
                        onComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                        aspectRatio={4 / 3}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
