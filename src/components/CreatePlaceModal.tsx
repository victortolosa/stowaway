import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPlace, updatePlace, uploadImageWithCleanup, deleteStorageFile } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { Place } from '@/types'
import { Modal, Button, Input, Select, FormField, MultiImageUploader, ProgressBar } from '@/components/ui'
import { useImageCompression } from '@/hooks'
import { useGroups } from '@/hooks/queries/useGroups'

const placeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['home', 'office', 'storage', 'other']),
    groupId: z.string().optional(),
})

type PlaceFormValues = z.infer<typeof placeSchema>

interface CreatePlaceModalProps {
    isOpen: boolean
    onClose: () => void
    onPlaceCreated: (placeId?: string) => void
    editMode?: boolean
    initialData?: Place
    preselectedGroupId?: string | null
}

export function CreatePlaceModal({ isOpen, onClose, onPlaceCreated, editMode = false, initialData, preselectedGroupId }: CreatePlaceModalProps) {
    const user = useAuthStore((state) => state.user)
    const { data: groups = [] } = useGroups()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [images, setImages] = useState<(File | string)[]>([])

    // Derived state for compression progress (simple average for now if multiple)
    const { compress, isCompressing, progress } = useImageCompression()

    const placeGroups = groups.filter(g => g.type === 'place' && g.parentId === null)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PlaceFormValues>({
        resolver: zodResolver(placeSchema),
        defaultValues: {
            type: 'home',
            groupId: '',
        },
    })

    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
                type: initialData.type,
                groupId: initialData.groupId || '',
            })
            setImages(initialData.photos || [])
        } else if (isOpen && !editMode) {
            reset({
                type: 'home',
                name: '',
                groupId: preselectedGroupId || '',
            })
            setImages([])
        }
    }, [isOpen, editMode, initialData, reset, preselectedGroupId])

    const onSubmit = async (data: PlaceFormValues) => {
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

            // Process uploads sequentially to avoid flooding or race conditions
            for (const file of filesToUpload) {
                const compressedPhoto = await compress(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                })

                const ext = compressedPhoto.type.split('/')[1] || 'jpg'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const path = `places/${user.uid}/${filename}`

                // We use uploadImageWithCleanup logic manually here effectively
                // But since we are doing multiple, we will catch errors at the top level and clean up all
                const url = await uploadImageWithCleanup(compressedPhoto, path, async () => { })
                newPhotos.push(url)
                uploadedPaths.push(path)
            }

            const finalPhotos = [...existingPhotos, ...newPhotos]

            let placeId: string | undefined

            if (editMode && initialData) {
                await updatePlace(initialData.id, {
                    ...data,
                    groupId: data.groupId || null,
                    photos: finalPhotos
                })
                placeId = initialData.id
            } else {
                placeId = await createPlace({
                    name: data.name,
                    type: data.type,
                    groupId: data.groupId || null,
                    photos: finalPhotos
                })
            }

            reset()
            setImages([])
            onPlaceCreated(placeId)
            onClose()
        } catch (error) {
            console.error('Failed to save place:', error)
            // Cleanup uploaded files if save failed
            try {
                if (uploadedPaths.length > 0) {
                    await Promise.all(uploadedPaths.map(path => deleteStorageFile(path)))
                }
            } catch (cleanupErr) {
                console.error('Failed to cleanup uploaded files:', cleanupErr)
            }
            alert('Failed to save place. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editMode ? 'Edit Place' : 'Add New Place'}
            description={`Form to ${editMode ? 'edit' : 'create'} a storage location`}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                    label="Place Name"
                    htmlFor="name"
                    error={errors.name?.message}
                >
                    <Input
                        id="name"
                        type="text"
                        placeholder="e.g., Home, Garage, Storage Unit 54"
                        error={!!errors.name}
                        {...register('name')}
                    />
                </FormField>

                <FormField
                    label="Type"
                    htmlFor="type"
                    error={errors.type?.message}
                >
                    <Select
                        id="type"
                        error={!!errors.type}
                        {...register('type')}
                    >
                        <option value="home">Home</option>
                        <option value="office">Office</option>
                        <option value="storage">Storage Unit</option>
                        <option value="other">Other</option>
                    </Select>
                </FormField>

                <FormField
                    label="Place Group (Optional)"
                    htmlFor="groupId"
                    error={errors.groupId?.message}
                >
                    <Select
                        id="groupId"
                        error={!!errors.groupId}
                        {...register('groupId')}
                    >
                        <option value="">None (Top Level)</option>
                        {placeGroups.map(group => (
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
                        label="Place Photo"
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
                    <Button type="submit" isLoading={isSubmitting || isCompressing}>
                        {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Place')}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
