import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createGroup, updateContainer } from '@/services/firebaseService'
import { useAuthStore } from '@/store/auth'
import { Modal, Button, Input, FormField } from '@/components/ui'
import { Check, Package, Search } from 'lucide-react'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useGroups } from '@/hooks/queries/useGroups'

const groupSchema = z.object({
    name: z.string().min(1, 'Name is required'),
})

type GroupFormValues = z.infer<typeof groupSchema>

interface SelectContainersForGroupModalProps {
    isOpen: boolean
    onClose: () => void
    onGroupCreated: () => void
}

export function SelectContainersForGroupModal({
    isOpen,
    onClose,
    onGroupCreated,
}: SelectContainersForGroupModalProps) {
    const user = useAuthStore((state) => state.user)

    const { data: containers = [] } = useAllContainers()
    const { data: places = [] } = usePlaces()
    const { data: groups = [] } = useGroups()

    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

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
            setSelectedContainerIds(new Set())
            setSearchQuery('')
            setSelectedPlaceId(null)
        }
    }, [isOpen, reset])

    // Filter containers based on selected place
    const availableContainers = selectedPlaceId
        ? containers.filter(c => c.placeId === selectedPlaceId)
        : containers

    const filteredContainers = availableContainers.filter(container =>
        container.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const toggleContainerSelection = (containerId: string) => {
        const newSet = new Set(selectedContainerIds)
        const container = containers.find(c => c.id === containerId)

        if (!container) return

        // If this is the first selection, lock to this place
        if (selectedContainerIds.size === 0) {
            setSelectedPlaceId(container.placeId)
            newSet.add(containerId)
        } else {
            // Toggle selection
            if (newSet.has(containerId)) {
                newSet.delete(containerId)
                // If no containers selected, unlock place
                if (newSet.size === 0) {
                    setSelectedPlaceId(null)
                }
            } else {
                newSet.add(containerId)
            }
        }

        setSelectedContainerIds(newSet)
    }

    const onSubmit = async (data: GroupFormValues) => {
        if (!user || selectedContainerIds.size === 0) return

        setIsSubmitting(true)
        try {
            // Create the group
            const groupId = await createGroup({
                name: data.name,
                type: 'container',
                parentId: selectedPlaceId,
            })

            // Update all selected containers with the new groupId
            const updatePromises: Promise<void>[] = []
            selectedContainerIds.forEach(containerId => {
                updatePromises.push(updateContainer(containerId, { groupId }))
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

    const getContainerPlace = (containerId: string) => {
        const container = containers.find(c => c.id === containerId)
        if (!container) return ''
        const place = places.find(p => p.id === container.placeId)
        return place?.name || ''
    }

    const getContainerGroup = (containerId: string) => {
        const container = containers.find(c => c.id === containerId)
        if (!container?.groupId) return null
        return groups.find(g => g.id === container.groupId)
    }

    const selectedPlace = selectedPlaceId
        ? places.find(p => p.id === selectedPlaceId)
        : null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Container Group"
            description="Select containers to group together"
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
                        placeholder="e.g., Storage Bins, Tool Boxes, Closets"
                        error={!!errors.name}
                        {...register('name')}
                    />
                </FormField>

                {selectedPlace && (
                    <div className="p-3 bg-accent-aqua/10 rounded-lg border border-accent-aqua/20">
                        <p className="text-sm text-text-secondary">
                            Grouping containers from: <span className="font-semibold text-text-primary">{selectedPlace.name}</span>
                        </p>
                    </div>
                )}

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-text-primary">
                            {selectedContainerIds.size === 0
                                ? 'Select first container to start grouping'
                                : `Select containers from ${selectedPlace?.name || 'this place'}`
                            }
                        </label>
                        <span className="text-xs text-text-tertiary">
                            {selectedContainerIds.size} selected
                        </span>
                    </div>

                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={16} />
                        <input
                            type="text"
                            placeholder="Search containers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-border-standard rounded-lg text-sm focus:border-accent-aqua outline-none transition-colors"
                        />
                    </div>

                    <div className="border border-border-standard rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                        {filteredContainers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-text-tertiary">
                                {searchQuery ? 'No containers found' : 'No containers available'}
                            </div>
                        ) : (
                            filteredContainers.map((container) => {
                                const isSelected = selectedContainerIds.has(container.id)
                                const currentGroup = getContainerGroup(container.id)
                                const isDisabled = selectedPlaceId && container.placeId !== selectedPlaceId

                                return (
                                    <div
                                        key={container.id}
                                        onClick={() => !isDisabled && toggleContainerSelection(container.id)}
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
                                                        {container.name}
                                                    </span>
                                                    {currentGroup && (
                                                        <span className="text-xs px-2 py-0.5 bg-bg-elevated rounded-full text-text-tertiary flex-shrink-0">
                                                            {currentGroup.name}
                                                        </span>
                                                    )}
                                                </div>
                                                {!selectedPlaceId && (
                                                    <p className="text-xs text-text-tertiary truncate">
                                                        {getContainerPlace(container.id)}
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
                        disabled={selectedContainerIds.size === 0}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Group'}
                    </Button>
                </div>
            </form>
        </Modal>
    )
}
