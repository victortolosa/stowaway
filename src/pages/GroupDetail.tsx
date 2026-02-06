import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGroup } from '@/hooks/queries/useGroups'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { ListItem, LoadingState, EmptyState, IconOrEmoji, NavigationHeader, Button, Badge } from '@/components/ui'
import { Plus } from 'lucide-react'
import { ItemCard } from '@/components/ItemCard'
import { CreatePlaceModal, CreateContainerModal, CreateItemModal } from '@/components'
import { useQueryClient } from '@tanstack/react-query'
import { PLACE_KEYS } from '@/hooks/queries/usePlaces'
import { CONTAINER_KEYS } from '@/hooks/queries/useContainers'
import { ITEM_KEYS } from '@/hooks/queries/useItems'
import { getPlaceIcon, getContainerIcon } from '@/utils/colorUtils'
import { useAuthStore } from '@/store/auth'
import { isPlaceShared, canEditPlace } from '@/utils/placeUtils'

export function GroupDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const user = useAuthStore((state) => state.user)

    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const { data: group, isLoading: isGroupLoading, error } = useGroup(id)

    const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
    const { data: containers = [], isLoading: isContainersLoading } = useAllContainers()
    const { data: items = [], isLoading: isItemsLoading } = useAllItems()

    const isLoading = isGroupLoading || isPlacesLoading || isContainersLoading || isItemsLoading

    if (isLoading) {
        return <LoadingState message="Loading group details..." />
    }

    if (error || !group) {
        return (
            <EmptyState
                message="Group not found"
                actionLabel="Go Back"
                onAction={() => navigate(-1)}
            />
        )
    }

    // Color and icon now come from database

    const groupPlace =
        group.type === 'container'
            ? places.find((p) => p.id === group.parentId)
            : group.type === 'item'
                ? places.find((p) => p.id === containers.find((c) => c.id === group.parentId)?.placeId)
                : null

    const canEditGroup =
        group.type === 'place'
            ? !!user
            : !!groupPlace && canEditPlace(groupPlace, user?.uid)

    const renderContent = () => {
        if (group.type === 'place') {
            const groupPlaces = places.filter(p => p.groupId === group.id)
            if (groupPlaces.length === 0) {
                return <EmptyState message="No places in this group" />
            }
            return (
                <div className="flex flex-col gap-3">
                    {groupPlaces.map((place) => {
                        const placeContainers = containers.filter(c => c.placeId === place.id)
                        const placeColor = place.color || '#14B8A6'
                        const shared = isPlaceShared(place, user?.uid)
                        return (
                            <ListItem
                                key={place.id}
                                title={place.name}
                                subtitle={`${placeContainers.length} container${placeContainers.length !== 1 ? 's' : ''}`}
                                leftContent={
                                    <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} />
                                }
                                rightContent={shared ? (
                                    <Badge size="sm" variant="info">
                                        Shared
                                    </Badge>
                                ) : undefined}
                                onClick={() => navigate(`/places/${place.id}`)}
                            />
                        )
                    })}
                </div>
            )
        }

        if (group.type === 'container') {
            const groupContainers = containers.filter(c => c.groupId === group.id)
            if (groupContainers.length === 0) {
                return <EmptyState message="No containers in this group" />
            }
            return (
                <div className="flex flex-col gap-3">
                    {groupContainers.map((container) => {
                        const place = places.find(p => p.id === container.placeId)
                        const containerItems = items.filter(i => i.containerId === container.id)
                        const containerColor = container.color || '#3B82F6'
                        return (
                            <ListItem
                                key={container.id}
                                title={container.name}
                                subtitle={`${place?.name || 'Unknown Location'} · ${containerItems.length} items`}
                                leftContent={
                                    <IconOrEmoji iconValue={container.icon} defaultIcon={getContainerIcon()} color={containerColor} />
                                }
                                onClick={() => navigate(`/containers/${container.id}`)}
                            />
                        )
                    })}
                </div>
            )
        }

        if (group.type === 'item') {
            const groupItems = items.filter(i => i.groupId === group.id)
            if (groupItems.length === 0) {
                return <EmptyState message="No items in this group" />
            }
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {groupItems.map(item => {
                        const container = containers.find(c => c.id === item.containerId)
                        const place = places.find(p => p.id === container?.placeId)
                        const location = place ? `${place.name} → ${container?.name}` : container?.name
                        return (
                            <ItemCard
                                key={item.id}
                                item={item}
                                location={location}
                                onClick={() => navigate(`/items/${item.id}`)}
                            />
                        )
                    })}
                </div>
            )
        }

        return null
    }

    const getGroupSubtitle = () => {
        if (group.type === 'container' && group.parentId) {
            const place = places.find(p => p.id === group.parentId)
            return place ? `Container group in ${place.name}` : 'Container Group'
        }
        if (group.type === 'item' && group.parentId) {
            const container = containers.find(c => c.id === group.parentId)
            return container ? `Item group in ${container.name}` : 'Item Group'
        }
        return group.type.charAt(0).toUpperCase() + group.type.slice(1) + ' Group'
    }

    return (
        <div className="flex flex-col h-full pb-32">
            <NavigationHeader
                title={group.name}
                actions={
                    canEditGroup ? (
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={Plus}
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            Add {group.type.charAt(0).toUpperCase() + group.type.slice(1)}
                        </Button>
                    ) : undefined
                }
            />
            <div className="px-4 -mt-2 mb-6">
                <p className="text-sm text-text-secondary">
                    {getGroupSubtitle()}
                </p>
            </div>
            <div className="px-4">
                {renderContent()}
            </div>

            {group.type === 'place' && canEditGroup && (
                <CreatePlaceModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onPlaceCreated={() => {
                        queryClient.invalidateQueries({ queryKey: PLACE_KEYS.all })
                        setIsAddModalOpen(false)
                    }}
                    preselectedGroupId={group.id}
                />
            )}

            {group.type === 'container' && canEditGroup && (
                <CreateContainerModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onContainerCreated={() => {
                        queryClient.invalidateQueries({ queryKey: CONTAINER_KEYS.all })
                        setIsAddModalOpen(false)
                    }}
                    placeId={group.parentId || ''}
                    preselectedGroupId={group.id}
                />
            )}

            {group.type === 'item' && canEditGroup && (
                <CreateItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onItemCreated={() => {
                        queryClient.invalidateQueries({ queryKey: ITEM_KEYS.all })
                        setIsAddModalOpen(false)
                    }}
                    containerId={group.parentId || ''}
                    preselectedGroupId={group.id}
                />
            )}
        </div>
    )
}
