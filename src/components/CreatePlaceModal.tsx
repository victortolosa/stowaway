import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { createPlace, updatePlace } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { Place } from '@/types'

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

    // Pre-fill form when editing
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
                    ...data,
                    userId: user.uid,
                } as any)
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
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-lg p-6 z-50">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-bold">
                            {editMode ? 'Edit Place' : 'Add New Place'}
                        </Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Form to {editMode ? 'edit' : 'create'} a storage location
                        </Dialog.Description>
                        <Dialog.Close className="text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </Dialog.Close>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Place Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Home, Garage, Storage Unit 54"
                                {...register('name')}
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                            </label>
                            <select
                                id="type"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                {...register('type')}
                            >
                                <option value="home">Home</option>
                                <option value="office">Office</option>
                                <option value="storage">Storage Unit</option>
                                <option value="other">Other</option>
                            </select>
                            {errors.type && (
                                <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Place')}
                            </button>
                        </div>
                    </form>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
