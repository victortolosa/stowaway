import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createGroup, updateItem } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { Modal, Button, Input, FormField } from '@/components/ui'
import { Check, Package, Search } from 'lucide-react'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useGroups } from '@/hooks/queries/useGroups'

const groupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
})

type GroupFormValues = z.infer<typeof groupSchema>

interface SelectItemsForGroupModalProps {
    isOpen: boolean
    onClose: () => void
    onGroupCreated: () => void
}

export function SelectItemsForGroupModal({
    isOpen,
    onClose,
    onGroupCreated,
}: SelectItemsForGroupModalProps) {
    const user = useAuthStore((state) => state.user)

    const { data: items = [] } = useAllItems()
    const { data: containers = [] } = useAllContainers()
    const { data: places = [] } = usePlaces()
    const { data: groups = [] } = useGroups()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<GroupFormValues>({
        resolver: zodResolver(groupSchema),
    })

    useEffect(() => {
        if (isOpen) {
            reset({ name: '' })
            setSelectedItemIds(new Set())
            setSearchQuery('')
            setSelectedContainerId(null)
        }
    }, [isOpen, reset])

    // Filter items based on selected container
    const availableItems = selectedContainerId
        ? items.filter(i => i.containerId === selectedContainerId)
        : items

    const filteredItems = availableItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const toggleItemSelection = (itemId: string) => {
        const newSet = new Set(selectedItemIds)
        const item = items.find(i => i.id === itemId)

        if (!item) return

        // If this is the first selection, lock to this container
        if (selectedItemIds.size === 0) {
            setSelectedContainerId(item.containerId)
            newSet.add(itemId)
        } else {
            // Toggle selection
            if (newSet.has(itemId)) {
                newSet.delete(itemId)
                // If no items selected, unlock container
                if (newSet.size === 0) {
                    setSelectedContainerId(null)
                }
            } else {
                newSet.add(itemId)
            }
        }

        setSelectedItemIds(newSet)
    }

    const onSubmit = async (data: GroupFormValues) => {
        if (!user || selectedItemIds.size === 0) return

        setIsSubmitting(true)
        try {
            // Create the group
            const groupId = await createGroup({
                name: data.name,
                type: 'item',
                parentId: selectedContainerId,
            })

            // Update all selected items with the new groupId
            const updatePromises: Promise<void>[] = []
            selectedItemIds.forEach(itemId => {
                updatePromises.push(updateItem(itemId, { groupId }))
            })

            await Promise.all(updatePromises)

            reset()
            onGroupCreated()
            onClose()
        } catch (error) {
            console.error('Failed to create group:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const getItemLocation = (itemId: string) => {
        const item = items.find(i => i.id === itemId)
        if (!item) return ''
        const container = containers.find(c => c.id === item.containerId)
        const place = places.find(p => p.id === container?.placeId)
        return `${place?.name || ''} → ${container?.name || ''}`
    }

    const getItemGroup = (itemId: string) => {
        const item = items.find(i => i.id === itemId)
        if (!item?.groupId) return null
        return groups.find(g => g.id === item.groupId)
    }

    const selectedContainer = selectedContainerId
        ? containers.find(c => c.id === selectedContainerId)
        : null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Item Group"
            description="Select items to group together"
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
                        placeholder="e.g., Winter Clothes, Tools, Electronics"
                        error={!!errors.name}
                        {...register('name')}
                    />
                </FormField>

                {selectedContainer && (
                    <div className="p-3 bg-accent-aqua/10 rounded-lg border border-accent-aqua/20">
                        <p className="text-sm text-text-secondary">
                            Grouping items from: <span className="font-semibold text-text-primary">{getItemLocation(Array.from(selectedItemIds)[0])}</span>
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-text-primary">
                            {selectedItemIds.size === 0
                                ? 'Select first item to start grouping'
                                : `Select items from ${selectedContainer?.name || 'this container'}`
                            }
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

                    <div className="border border-border-standard rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                        {filteredItems.length === 0 ? (
                            <div className="p-4 text-center text-sm text-text-tertiary">
                                {searchQuery ? 'No items found' : 'No items available'}
                            </div>
                        ) : (
                            filteredItems.map((item) => {
                                const isSelected = selectedItemIds.has(item.id)
                                const currentGroup = getItemGroup(item.id)
                                const isDisabled = selectedContainerId && item.containerId !== selectedContainerId

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => !isDisabled && toggleItemSelection(item.id)}
                                        className={`flex items-center gap-3 p-3 border-b border-border-light last:border-0 transition-colors ${isDisabled
                                                ? 'opacity-30 cursor-not-allowed'
                                                : isSelected
                                                    ? 'bg-accent-aqua/5 cursor-pointer'
                                                    : 'hover:bg-bg-surface cursor-pointer'
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
                                                <Package size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-text-primary truncate font-medium">
                                                        {item.name}
                                                    </span>
                                                    {currentGroup && (
                                                        <span className="text-xs px-2 py-0.5 bg-bg-elevated rounded-full text-text-tertiary flex-shrink-0">
                                                            {currentGroup.name}
                                                        </span>
                                                    )}
                                                </div>
                                                {!selectedContainerId && (
                                                    <p className="text-xs text-text-tertiary truncate">
                                                        {getItemLocation(item.id)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isSubmitting}
                        disabled={selectedItemIds.size === 0}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Group'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
