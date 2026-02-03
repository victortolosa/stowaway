import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { createContainer, updateContainer, uploadImageWithCleanup, deleteStorageFile } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { useImageCompression, useInventory } from '@/hooks'
// ImageCropper removed
// import { ImageCropper } from '@/components'
import { Container } from '@/types'
import { Modal, Button, Input, FormField, MultiImageUploader, ProgressBar, Select } from '@/components/ui'

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
    const [images, setImages] = useState<(File | string)[]>([])
    // Cropper removed for multi-image flow simplicity
    // const [showCropper, setShowCropper] = useState(false)
    // const [imageToCrop, setImageToCrop] = useState<string | null>(null)

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
            // Load existing photos, fall back to single photoUrl if no photos array
            setImages(initialData.photos || (initialData.photoUrl ? [initialData.photoUrl] : []))
        } else if (isOpen && !editMode) {
            reset({
                name: '',
                groupId: '',
            })
            setImages([])
        }
    }, [isOpen, editMode, initialData, reset])

    const onSubmit = async (data: ContainerFormValues) => {
        if (!user) return

        setIsSubmitting(true)
        const uploadedPaths: string[] = []

        try {
            const newPhotos: string[] = []
            const existingPhotos: string[] = []

            // Separate existing URLs from new Files
            for (const img of images) {
                if (typeof img === 'string') {
                    existingPhotos.push(img)
                }
            }

            // Upload new files
            const filesToUpload = images.filter(img => img instanceof File) as File[]

            for (const file of filesToUpload) {
                const compressedPhoto = await compress(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                })

                const ext = compressedPhoto.type.split('/')[1] || 'jpg'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const path = `containers/${user.uid}/${filename}`

                const url = await uploadImageWithCleanup(compressedPhoto, path, async () => { })
                newPhotos.push(url)
                uploadedPaths.push(path)
            }

            const finalPhotos = [...existingPhotos, ...newPhotos]

            if (editMode && initialData) {
                await updateContainer(initialData.id, {
                    ...data,
                    photos: finalPhotos,
                    // Legacy support is handled in service, but we pass photos array
                    groupId: data.groupId || null,
                })
            } else {
                await createContainer({
                    name: data.name,
                    placeId,
                    photos: finalPhotos,
                    lastAccessed: new Date(),
                    groupId: data.groupId || null,
                })
            }

            reset()
            setImages([])
            onContainerCreated()
            onClose()
        } catch (error) {
            console.error('Failed to save container:', error)
            // Cleanup uploaded files if save failed
            try {
                if (uploadedPaths.length > 0) {
                    await Promise.all(uploadedPaths.map(path => deleteStorageFile(path)))
                }
            } catch (cleanupErr) {
                console.error('Failed to cleanup uploaded files:', cleanupErr)
            }
            alert('Failed to save container. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Cropper functions removed

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

                    <FormField label="Photos (Optional)">
                        <MultiImageUploader
                            value={images}
                            onChange={setImages}
                            label="Container Photo"
                        />
                        {isCompressing && (
                            <ProgressBar
                                progress={progress}
                                label="Compressing images..."
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

            {/* Cropper removed */}
        </>
    )
}
