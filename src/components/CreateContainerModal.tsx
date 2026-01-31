import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Camera, Image as ImageIcon } from 'lucide-react'
import { createContainer, updateContainer, uploadImageWithCleanup } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { useImageCompression } from '@/hooks'
import { ImageCropper } from '@/components'
import { Container } from '@/types'

const containerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
})

type ContainerFormValues = z.infer<typeof containerSchema>

interface CreateContainerModalProps {
    isOpen: boolean
    onClose: () => void
    onContainerCreated: () => void
    placeId: string
    editMode?: boolean
    initialData?: Container
}

export function CreateContainerModal({
    isOpen,
    onClose,
    onContainerCreated,
    placeId,
    editMode = false,
    initialData
}: CreateContainerModalProps) {
    const user = useAuthStore((state) => state.user)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [showCropper, setShowCropper] = useState(false)
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)

    const { compress, isCompressing, progress } = useImageCompression()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContainerFormValues>({
        resolver: zodResolver(containerSchema),
    })

    // Pre-fill form when editing
    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
            })
            setPhotoFile(null)
            setPhotoPreview(initialData.photoUrl || null)
        } else if (isOpen && !editMode) {
            reset({
                name: '',
            })
            setPhotoFile(null)
            setPhotoPreview(null)
        }
    }, [isOpen, editMode, initialData, reset])

    const onSubmit = async (data: ContainerFormValues) => {
        if (!user) return

        setIsSubmitting(true)
        try {
            if (photoFile) {
                // Compress the image
                const compressedPhoto = await compress(photoFile, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                })

                const ext = compressedPhoto.type.split('/')[1] || 'jpg'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const path = `containers/${user.uid}/${filename}`

                // Use uploadImageWithCleanup for automatic orphan cleanup
                await uploadImageWithCleanup(
                    compressedPhoto,
                    path,
                    async (url) => {
                        // This will only run if upload succeeds
                        if (editMode && initialData) {
                            await updateContainer(initialData.id, {
                                ...data,
                                photoUrl: url,
                            })
                        } else {
                            await createContainer({
                                ...data,
                                placeId,
                                photoUrl: url,
                                lastAccessed: new Date(),
                            } as any)
                        }
                    }
                )
            } else {
                // No new photo uploaded
                if (editMode && initialData) {
                    await updateContainer(initialData.id, {
                        ...data,
                        photoUrl: initialData.photoUrl, // Keep existing photo
                    })
                } else {
                    await createContainer({
                        ...data,
                        placeId,
                        lastAccessed: new Date(),
                    } as any)
                }
            }

            reset()
            setPhotoFile(null)
            setPhotoPreview(null)
            onContainerCreated()
            onClose()
        } catch (error) {
            console.error('Failed to save container:', error)
            alert('Failed to save container. Please try again.')
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
                                {editMode ? 'Edit Container' : 'Add New Container'}
                            </Dialog.Title>
                            <Dialog.Close className="text-text-secondary hover:text-text-primary transition">
                                <X size={24} />
                            </Dialog.Close>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div>
                                <label htmlFor="name" className="block font-body text-[14px] font-medium text-text-primary mb-2">
                                    Container Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    className="w-full px-4 py-3 bg-bg-surface border-0 rounded-button font-body text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-pink"
                                    placeholder="e.g., Blue Bin, Top Drawer"
                                    {...register('name')}
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-[13px] mt-1.5">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="block font-body text-[14px] font-medium text-text-primary mb-2">
                                    Container Photo (Optional)
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
                                    {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Container')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Image Cropper Modal */}
            {showCropper && imageToCrop && (
                <ImageCropper
                    imageSrc={imageToCrop}
                    onComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                    aspectRatio={4 / 3}
                />
            )}
        </>
    )
}
