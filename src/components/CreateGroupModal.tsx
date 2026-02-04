import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createGroup, updateGroup, updatePlace, updateContainer, updateItem } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { Group } from '@/types'
import { Modal, Button, Input, FormField } from '@/components/ui'
import { Check, Package, MapPin, Search, Trash2 } from 'lucide-react'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'

const groupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
})

type GroupFormValues = z.infer<typeof groupSchema>

interface CreateGroupModalProps {
    isOpen: boolean
    onClose: () => void
    onGroupCreated: () => void
    type: 'place' | 'container' | 'item'
    parentId: string | null
    editMode?: boolean
    initialData?: Group
    onDelete?: () => void
}

export function CreateGroupModal({
    isOpen,
    onClose,
    onGroupCreated,
    type,
    parentId,
    editMode = false,
    initialData,
    onDelete
}: CreateGroupModalProps) {
    const user = useAuthStore((state) => state.user)

    const { data: places = [] } = usePlaces()
    const { data: containers = [] } = useAllContainers()
    const { data: items = [] } = useAllItems()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')

    const safePlaces = places || []
    const safeContainers = containers || []
    const safeItems = items || []

    // Filter available items that can be added to the group
    const availableItems = (() => {
        if (editMode) return [] // Disable item selection in edit mode for simplicity for now

        switch (type) {
            case 'place':
                return safePlaces.filter(p => !p.groupId)
            case 'container':
                return safeContainers.filter(c => c.placeId === parentId && !c.groupId)
            case 'item':
                return safeItems.filter(i => i.containerId === parentId && !i.groupId)
            default:
                return []
        }
    })()

    const filteredItems = availableItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<GroupFormValues>({
        resolver: zodResolver(groupSchema),
    })

    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
            })
            setSelectedItemIds(new Set())
        } else if (isOpen && !editMode) {
            reset({
                name: '',
            })
            setSelectedItemIds(new Set())
        }
    }, [isOpen, editMode, initialData, reset])

    const toggleItemSelection = (id: string) => {
        const newSet = new Set(selectedItemIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedItemIds(newSet)
    }

    const onSubmit = async (data: GroupFormValues) => {
        if (!user) return

        setIsSubmitting(true)
        try {
            let groupId = ''

            if (editMode && initialData) {
                await updateGroup(initialData.id, data)
                groupId = initialData.id
            } else {
                groupId = await createGroup({
                    name: data.name,
                    type,
                    parentId,
                })
            }

            // Batch update selected items with the new groupId
            if (selectedItemIds.size > 0 && groupId) {
                const updatePromises: Promise<void>[] = []

                selectedItemIds.forEach(itemId => {
                    if (type === 'place') {
                        updatePromises.push(updatePlace(itemId, { groupId }))
                    } else if (type === 'container') {
                        updatePromises.push(updateContainer(itemId, { groupId }))
                    } else if (type === 'item') {
                        updatePromises.push(updateItem(itemId, { groupId }))
                    }
                })

                await Promise.all(updatePromises)
            }

            reset()
            onGroupCreated()
            onClose()
        } catch (error) {
            console.error('Failed to save group:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getItemIcon = () => {
        switch (type) {
            case 'place': return MapPin
            case 'container': return Package
            case 'item': return Package
            default: return Package
        }
    }

    const ItemIcon = getItemIcon()

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editMode ? 'Edit Group' : `Add New ${type === 'place' ? 'Place ' : ''}Group`}
            description={`Form to ${editMode ? 'edit' : 'create'} a group for organization`}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    label="Group Name"
                    htmlFor="name"
                    error={errors.name?.message}
                >
                    <Input
                        id="name"
                        type="text"
                        placeholder="e.g., Seasonal, Fragile, Office Supplies"
                        error={!!errors.name}
                        {...register('name')}
                    />
                </FormField>

                {!editMode && availableItems.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-text-primary">
                                Add Items to Group (Optional)
                            </label>
                            <span className="text-xs text-text-tertiary">
                                {selectedItemIds.size} selected
                            </span>
                        </div>

                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border-standard rounded-lg text-sm focus:border-accent-aqua outline-none transition-colors"
                            />
                        </div>

                        <div className="border border-border-standard rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                            {filteredItems.length === 0 ? (
                                <div className="p-4 text-center text-sm text-text-tertiary">
                                    No items found
                                </div>
                            ) : (
                                filteredItems.map((item) => {
                                    const isSelected = selectedItemIds.has(item.id)
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => toggleItemSelection(item.id)}
                                            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border-light last:border-0 ${isSelected ? 'bg-accent-aqua/5' : 'hover:bg-bg-surface'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected
                                                ? 'bg-accent-aqua border-accent-aqua'
                                                : 'border-text-tertiary bg-white'
                                                }`}>
                                                {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                            </div>

                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <div className="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center text-text-secondary flex-shrink-0">
                                                    <ItemIcon size={14} />
                                                </div>
                                                <span className="text-sm text-text-primary truncate font-medium">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}

                <div className={`flex ${editMode && onDelete ? 'justify-between' : 'justify-end'} gap-3 pt-2`}>
                    {editMode && onDelete && (
                        <div className='mr-auto'>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onDelete}
                                leftIcon={Trash2}
                                className="!text-accent-danger hover:!bg-accent-danger/10 !border-accent-danger/20"
                            >
                                Delete Group
                            </Button>
                        </div>
                    )}
                    <div className="flex gap-3">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isSubmitting}>
                            {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Group')}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}
