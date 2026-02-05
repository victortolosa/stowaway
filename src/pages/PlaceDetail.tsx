import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { CreateContainerModal, CreatePlaceModal, ConfirmDeleteModal, CreateGroupModal } from '@/components'
import { usePlace } from '@/hooks/queries/usePlaces'
import { usePlaceContainers } from '@/hooks/queries/useContainers'
import { usePlaceItems } from '@/hooks/queries/useItems'
import { useGroups } from '@/hooks/queries/useGroups'
import { useQueryClient } from '@tanstack/react-query'
import { deleteContainer, deletePlace, deleteGroup, updatePlace } from '@/services/firebaseService'
import { Container, Group } from '@/types'
import { PLACE_KEYS } from '@/hooks/queries/usePlaces'
import { CONTAINER_KEYS } from '@/hooks/queries/useContainers'
import { ITEM_KEYS } from '@/hooks/queries/useItems'
import { GROUP_KEYS } from '@/hooks/queries/useGroups'
import { MoreVertical, Plus, Search, FolderPlus } from 'lucide-react'
import { Button, EmptyState, LoadingState, NavigationHeader, Modal, GalleryEditor } from '@/components/ui'
import { PlaceHero } from '@/components/features/place/PlaceHero'
import { ContainerList } from '@/components/features/place/ContainerList'
import { PlaceItemsList } from '@/components/features/place/PlaceItemsList'
import { useSearchFilter } from '@/hooks/useSearchFilter'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'


export function PlaceDetail() {
    const { id } = useParams<{ id: string }>()
    const user = useAuthStore((state) => state.user)
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    // Fetch data using React Query
    const { data: place, isLoading: isPlaceLoading } = usePlace(id!)
    const { data: containers = [], isLoading: isContainersLoading } = usePlaceContainers(id!)
    const { data: items = [], isLoading: isItemsLoading } = usePlaceItems(id!)
    const { data: groups = [], isLoading: isGroupsLoading } = useGroups()

    const isLoading = isPlaceLoading || isContainersLoading || isItemsLoading || isGroupsLoading

    const refresh = async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: PLACE_KEYS.detail(id!) }),
            // Invalidate all container queries to ensure Dashboard (useAllContainers) is updated
            queryClient.invalidateQueries({ queryKey: CONTAINER_KEYS.all }),
            queryClient.invalidateQueries({ queryKey: ITEM_KEYS.byPlace(id!) }),
            queryClient.invalidateQueries({ queryKey: GROUP_KEYS.list(user?.uid || '') })
        ])
    }

    const [isCreateContainerOpen, setIsCreateContainerOpen] = useState(false)
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const [isEditingPlace, setIsEditingPlace] = useState(false)
    const [isDeletingPlace, setIsDeletingPlace] = useState(false)
    const [isDeletePlaceConfirmOpen, setIsDeletePlaceConfirmOpen] = useState(false)

    const [editingContainer, setEditingContainer] = useState<Container | null>(null)
    const [deletingContainer, setDeletingContainer] = useState<Container | null>(null)
    const [isDeletingContainer, setIsDeletingContainer] = useState(false)

    const [editingGroup, setEditingGroup] = useState<Group | null>(null)
    const [deletingGroup, setDeletingGroup] = useState<Group | null>(null)
    const [isDeletingGroup, setIsDeletingGroup] = useState(false)
    const [showGallery, setShowGallery] = useState(false)
    const [isCreateSiblingPlaceOpen, setIsCreateSiblingPlaceOpen] = useState(false)

    const placeContainers = containers // Already filtered by hook
    const placeGroups = (groups || []).filter((g) => g.parentId === id && g.type === 'container')

    // Filter content based on search query
    const filteredContainers = useSearchFilter({
        data: placeContainers,
        searchQuery,
        searchKeys: ['name']
    })

    // For items, we only want to show them if there is a search query
    const allPlaceItems = useSearchFilter({
        data: items,
        searchQuery,
        searchKeys: ['name', 'description', 'tags'],
        additionalFilter: (item) => placeContainers.some(c => c.id === item.containerId)
    })

    // Only show items if searching
    const filteredItems = searchQuery ? allPlaceItems : []

    // Set global breadcrumbs
    useBreadcrumbs([
        { label: place?.name || '...', category: 'PLACES', categoryPath: '/places', groupId: place?.groupId || undefined, type: 'place' }
    ])

    if (!user || !id) {
        return <LoadingState />
    }

    if (isLoading) {
        return <LoadingState message="Loading place..." />
    }


    if (!place) {
        return <div>Place not found</div>
    }

    const totalItems = (items || []).filter((item) =>
        placeContainers.some((c) => c.id === item.containerId)
    ).length

    const handleDeletePlace = async () => {
        setIsDeletingPlace(true)
        try {
            await deletePlace(place.id)
            navigate('/places')
        } catch (error) {
            console.error('Failed to delete place:', error)
            setIsDeletingPlace(false)
        }
    }

    const handleDeleteContainer = async () => {
        if (!deletingContainer) return
        setIsDeletingContainer(true)
        try {
            await deleteContainer(deletingContainer.id)
            await refresh()
            setDeletingContainer(null)
        } catch (error) {
            console.error('Failed to delete container:', error)
        } finally {
            setIsDeletingContainer(false)
        }
    }

    const handleDeleteGroup = async () => {
        if (!deletingGroup) return
        setIsDeletingGroup(true)
        try {
            await deleteGroup(deletingGroup.id, 'container')
            await refresh()
            setDeletingGroup(null)
        } catch (error) {
            console.error('Failed to delete group:', error)
        } finally {
            setIsDeletingGroup(false)
        }
    }

    return (
        <div className="flex flex-col h-full pb-48 w-full max-w-full">
            {/* Header */}
            <NavigationHeader
                actions={
                    <div className="relative">
                        <Button
                            variant="icon"
                            size="icon"
                            className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
                            onClick={() => setIsCreateSiblingPlaceOpen(true)}
                        >
                            <Plus size={20} className="text-text-primary" strokeWidth={2} />
                        </Button>
                        <Button
                            variant="icon"
                            size="icon"
                            className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <MoreVertical size={20} className="text-text-primary" strokeWidth={2} />
                        </Button>
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-bg-page rounded-card shadow-card py-2 z-10 border border-border-standard">
                                <button
                                    onClick={() => {
                                        setIsEditingPlace(true)
                                        setShowMenu(false)
                                    }}
                                    className="w-full px-4 py-2 text-left font-body text-sm text-text-primary hover:bg-bg-surface"
                                >
                                    Edit Place
                                </button>
                                <button
                                    onClick={() => {
                                        setIsDeletePlaceConfirmOpen(true)
                                        setShowMenu(false)
                                    }}
                                    className="w-full px-4 py-2 text-left font-body text-sm text-accent-danger hover:bg-bg-surface"
                                >
                                    Delete Place
                                </button>
                            </div>
                        )}
                    </div>
                }
            />

            {/* Place Hero */}
            <PlaceHero
                place={place}
                containerCount={placeContainers.length}
                itemCount={totalItems}
                onImageClick={() => setShowGallery(true)}
            />

            {/* Search Bar */}
            {(placeContainers.length > 0 || totalItems > 0) && (
                <>
                    <div className="mb-4">
                        <div className="bg-bg-surface rounded-xl h-[48px] px-4 flex items-center gap-3 shadow-sm border border-border-light focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
                            <Search size={20} className="text-accent-aqua" strokeWidth={2.5} />
                            <input
                                type="text"
                                placeholder="Search containers and items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex-1 font-body text-[15px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
                            />
                        </div>
                    </div>

                    {!searchQuery && (
                        <div className="flex gap-3 mb-8">
                            <Button
                                variant="secondary"
                                size="sm"
                                fullWidth
                                leftIcon={FolderPlus}
                                onClick={() => setIsCreateGroupOpen(true)}
                            >
                                New Group
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                fullWidth
                                leftIcon={Plus}
                                onClick={() => setIsCreateContainerOpen(true)}
                            >
                                New Container
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Content Section */}
            <div className="flex flex-col gap-8">
                {/* Containers Section */}
                <ContainerList
                    containers={filteredContainers}
                    groups={placeGroups}
                    items={items}
                    searchQuery={searchQuery}
                    onEditGroup={setEditingGroup}
                    onAddContainer={() => setIsCreateContainerOpen(true)}
                />

                {/* Items Search Results */}
                <PlaceItemsList
                    items={filteredItems}
                    containers={placeContainers}
                    searchQuery={searchQuery}
                />

                {/* No Matches State */}
                {searchQuery && filteredContainers.length === 0 && filteredItems.length === 0 && (
                    <EmptyState
                        message="No containers or items match your search"
                    />
                )}
            </div>

            {/* Create Container Modal */}
            <CreateContainerModal
                isOpen={isCreateContainerOpen}
                onClose={() => setIsCreateContainerOpen(false)}
                onContainerCreated={() => {
                    refresh()
                    setIsCreateContainerOpen(false)
                }}
                placeId={id}
            />

            {/* Edit Place Modal */}
            {isEditingPlace && (
                <CreatePlaceModal
                    isOpen={isEditingPlace}
                    onClose={() => setIsEditingPlace(false)}
                    onPlaceCreated={() => {
                        refresh()
                        setIsEditingPlace(false)
                    }}
                    editMode
                    initialData={place}
                />
            )}

            {/* Create Sibling Place Modal */}
            <CreatePlaceModal
                isOpen={isCreateSiblingPlaceOpen}
                onClose={() => setIsCreateSiblingPlaceOpen(false)}
                onPlaceCreated={() => {
                    refresh()
                    setIsCreateSiblingPlaceOpen(false)
                }}
                preselectedGroupId={place.groupId}
            />

            {/* Edit Container Modal */}
            {editingContainer && (
                <CreateContainerModal
                    isOpen={!!editingContainer}
                    onClose={() => setEditingContainer(null)}
                    onContainerCreated={() => {
                        refresh()
                        setEditingContainer(null)
                    }}
                    placeId={id}
                    editMode
                    initialData={editingContainer}
                />
            )}

            {/* Delete Place Confirmation */}
            <ConfirmDeleteModal
                isOpen={isDeletePlaceConfirmOpen}
                onClose={() => setIsDeletePlaceConfirmOpen(false)}
                onConfirm={handleDeletePlace}
                title="Delete Place"
                message={`Are you sure you want to delete "${place.name}"? This action cannot be undone and will delete all containers and items within it.`}
                isDeleting={isDeletingPlace}
            />

            {/* Create Group Modal */}
            <CreateGroupModal
                isOpen={isCreateGroupOpen}
                onClose={() => setIsCreateGroupOpen(false)}
                onGroupCreated={refresh}
                type="container"
                parentId={id}
            />

            {/* Edit Group Modal */}
            {editingGroup && (
                <CreateGroupModal
                    isOpen={!!editingGroup}
                    onClose={() => setEditingGroup(null)}
                    onGroupCreated={refresh}
                    type="container"
                    parentId={id}
                    editMode
                    initialData={editingGroup}
                    onDelete={() => {
                        setEditingGroup(null)
                        setDeletingGroup(editingGroup)
                    }}
                />
            )}

            {/* Delete Group Confirmation */}
            {deletingGroup && (
                <ConfirmDeleteModal
                    isOpen={!!deletingGroup}
                    onClose={() => setDeletingGroup(null)}
                    onConfirm={handleDeleteGroup}
                    title="Delete Group"
                    message={`Are you sure you want to delete "${deletingGroup.name}"? The containers inside will not be deleted.`}
                    isDeleting={isDeletingGroup}
                />
            )}

            {/* Delete Container Confirmation */}
            {deletingContainer && (
                <ConfirmDeleteModal
                    isOpen={!!deletingContainer}
                    onClose={() => setDeletingContainer(null)}
                    onConfirm={handleDeleteContainer}
                    title="Delete Container"
                    message={`Are you sure you want to delete "${deletingContainer.name}"? This will also delete all items within it.`}
                    isDeleting={isDeletingContainer}
                />
            )}

            {/* Gallery Modal */}
            <Modal
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
                title="Photo Gallery"
                description={`${place.photos?.length || 0} photos`}
            >
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <GalleryEditor
                        images={place.photos || []}
                        onUpdate={async (newImages) => {
                            // Optimistic update locally? 
                            // Since we use react-query, we should mutate. 
                            // For now, let's just save and refresh.
                            try {
                                await updatePlace(place.id, { photos: newImages })
                                await refresh()
                            } catch (error) {
                                console.error('Failed to update photos:', error)
                                alert('Failed to update gallery')
                            }
                        }}
                    />
                </div>
                <div className="flex justify-end mt-4">
                    <Button variant="secondary" onClick={() => setShowGallery(false)}>
                        Close
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
