import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPlace, updatePlace } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { Place } from '@/types'
import { Modal, Button, Input, Select, FormField } from '@/components/ui'

const placeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    type: z.enum(['home', 'office', 'storage', 'other']),
})

type PlaceFormValues = z.infer<typeof placeSchema>

interface CreatePlaceModalProps {
    isOpen: boolean
    onClose: () => void
    onPlaceCreated: () => void
    editMode?: boolean
    initialData?: Place
}

export function CreatePlaceModal({ isOpen, onClose, onPlaceCreated, editMode = false, initialData }: CreatePlaceModalProps) {
    const user = useAuthStore((state) => state.user)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PlaceFormValues>({
        resolver: zodResolver(placeSchema),
        defaultValues: {
            type: 'home',
        },
    })

    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
                type: initialData.type,
            })
        } else if (isOpen && !editMode) {
            reset({
                type: 'home',
                name: '',
            })
        }
    }, [isOpen, editMode, initialData, reset])

    const onSubmit = async (data: PlaceFormValues) => {
        if (!user) return

        setIsSubmitting(true)
        try {
            if (editMode && initialData) {
                await updatePlace(initialData.id, data)
            } else {
                await createPlace({
                    name: data.name,
                    type: data.type,
                    userId: user.uid,
                })
            }

            reset()
            onPlaceCreated()
            onClose()
        } catch (error) {
            console.error('Failed to save place:', error)
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

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" isLoading={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Place')}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
