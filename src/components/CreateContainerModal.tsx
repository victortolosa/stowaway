import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence } from 'framer-motion'
import { createContainer, updateContainer, uploadImageWithCleanup } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { useImageCompression, useInventory } from '@/hooks'
import { ImageCropper } from '@/components'
import { Container } from '@/types'
import { Modal, Button, Input, FormField, ImageUploader, ProgressBar, Select } from '@/components/ui'

const containerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    groupId: z.string().optional(),
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
    const { groups } = useInventory()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [showCropper, setShowCropper] = useState(false)
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)

    const containerGroups = groups.filter(g => g.type === 'container' && g.parentId === placeId)

    const { compress, isCompressing, progress } = useImageCompression()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContainerFormValues>({
        resolver: zodResolver(containerSchema),
        defaultValues: {
            groupId: '',
        },
    })

    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
                groupId: initialData.groupId || '',
            })
            setPhotoFile(null)
            setPhotoPreview(initialData.photoUrl || null)
        } else if (isOpen && !editMode) {
            reset({
                name: '',
                groupId: '',
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
                const compressedPhoto = await compress(photoFile, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                })

                const ext = compressedPhoto.type.split('/')[1] || 'jpg'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const path = `containers/${user.uid}/${filename}`

                await uploadImageWithCleanup(
                    compressedPhoto,
                    path,
                    async (url) => {
                        if (editMode && initialData) {
                            await updateContainer(initialData.id, {
                                ...data,
                                photoUrl: url,
                                groupId: data.groupId || undefined,
                            })
                        } else {
                            await createContainer({
                                name: data.name,
                                placeId,
                                photoUrl: url,
                                lastAccessed: new Date(),
                                groupId: data.groupId || undefined,
                            })
                        }
                    }
                )
            } else {
                if (editMode && initialData) {
                    await updateContainer(initialData.id, {
                        ...data,
                        groupId: data.groupId || undefined,
                    })
                } else {
                    await createContainer({
                        name: data.name,
                        placeId,
                        lastAccessed: new Date(),
                        groupId: data.groupId || undefined,
                    })
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
        const file = new File([croppedBlob], `cropped_${Date.now()}.jpg`, {
            type: 'image/jpeg',
        })

        setPhotoFile(file)

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
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={editMode ? 'Edit Container' : 'Add New Container'}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                        label="Container Name"
                        htmlFor="name"
                        error={errors.name?.message}
                    >
                        <Input
                            id="name"
                            type="text"
                            placeholder="e.g., Blue Bin, Top Drawer"
                            error={!!errors.name}
                            {...register('name')}
                        />
                    </FormField>

                    <FormField
                        label="Container Group (Optional)"
                        htmlFor="groupId"
                        error={errors.groupId?.message}
                    >
                        <Select
                            id="groupId"
                            error={!!errors.groupId}
                            {...register('groupId')}
                        >
                            <option value="">None (Top Level)</option>
                            {containerGroups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <FormField label="Container Photo (Optional)">
                        <ImageUploader
                            preview={photoPreview}
                            onFileSelect={handleFileChange}
                            onRemove={removePhoto}
                            label="Photo"
                        />
                        {isCompressing && (
                            <ProgressBar
                                progress={progress}
                                label="Compressing image..."
                                className="mt-3"
                            />
                        )}
                    </FormField>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isSubmitting || isCompressing}
                        >
                            {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Container')}
                        </Button>
                    </div>
                </form>
            </Modal>

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
