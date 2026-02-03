import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { CreateContainerModal, CreatePlaceModal, ConfirmDeleteModal, CreateGroupModal, Breadcrumbs } from '@/components'
import { useInventory } from '@/hooks'
import { deleteContainer, deletePlace, deleteGroup } from '@/services/firebaseService'
import { Container, Group } from '@/types'
import { MoreVertical, ChevronRight, Package, Plus, QrCode, Search, Mic, FolderPlus, Pencil } from 'lucide-react'
import { Button, Card, IconBadge, EmptyState, LoadingState, Badge, NavigationHeader, ImageCarousel, ImageGrid, Modal } from '@/components/ui'
import { Timestamp } from 'firebase/firestore'

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Date | Timestamp): Date => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate()
    }
    return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

export function PlaceDetail() {
    const { id } = useParams<{ id: string }>()
    const user = useAuthStore((state) => state.user)
    const { places, containers, items, groups, isLoading, refresh } = useInventory()
    const navigate = useNavigate()

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

    if (!user || !id) {
        return <LoadingState />
    }

    if (isLoading) {
        return <LoadingState message="Loading place..." />
    }

    const place = places.find((p) => p.id === id)
    const placeContainers = containers.filter((c) => c.placeId === id)
    const placeGroups = (groups || []).filter((g) => g.parentId === id && g.type === 'container')

    if (!place) {
        return <div>Place not found</div>
    }

    const totalItems = (items || []).filter((item) =>
        placeContainers.some((c) => c.id === item.containerId)
    ).length

    // Filter content based on search query
    const filteredContainers = placeContainers.filter(container =>
        !searchQuery || container.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredItems = items.filter(item => {
        if (!searchQuery) return false
        const isInPlace = placeContainers.some(c => c.id === item.containerId)
        if (!isInPlace) return false

        const query = searchQuery.toLowerCase()
        return (
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.tags.some(tag => tag.toLowerCase().includes(query))
        )
    })

    const getContainerColor = (index: number) => {
        const colors = ['#3B82F6', '#3B82F6', '#3B82F6', '#18181B', '#F59E0B']
        return colors[index % colors.length]
    }

    const getContainerItemCount = (containerId: string) => {
        return (items || []).filter((item) => item.containerId === containerId).length
    }

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
        <div className="flex flex-col h-full pb-48">
            {/* Header */}
            <NavigationHeader
                backTo="/dashboard"
                actions={
                    <div className="relative">
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

            <div className="px-1">
                <Breadcrumbs
                    items={[
                        { label: 'Places', path: '/places' },
                        { label: place.name }
                    ]}
                />
            </div>

            {/* Place Hero */}
            {place.photos && place.photos.length > 0 ? (
                <div className="mb-6 px-1">
                    <div className="rounded-2xl overflow-hidden aspect-[21/9] mb-4 shadow-sm border border-border-light bg-bg-surface">
                        <ImageCarousel
                            images={place.photos}
                            alt={place.name}
                            onImageClick={() => setShowGallery(true)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">
                                Place
                            </span>
                            <h1 className="font-display text-[24px] font-bold text-text-primary leading-tight">
                                {place.name}
                            </h1>
                            <p className="font-body text-[13px] text-text-secondary">
                                {placeContainers.length} containers · {totalItems} items
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-4 mb-6 px-1">
                    <IconBadge icon={Package} color="#14B8A6" size="md" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold tracking-wider text-text-tertiary uppercase">
                            Place
                        </span>
                        <h1 className="font-display text-[24px] font-bold text-text-primary leading-tight">
                            {place.name}
                        </h1>
                        <p className="font-body text-[13px] text-text-secondary">
                            {placeContainers.length} containers · {totalItems} items
                        </p>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            {(placeContainers.length > 0 || totalItems > 0) && (
                <>
                    <div className="mb-4">
                        <div className="bg-white rounded-xl h-[48px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
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
                        <div className="flex gap-3 mb-6">
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
            <div className="flex flex-col gap-6">
                {/* Containers Section */}
                {(filteredContainers.length > 0 || !searchQuery) && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="font-display text-[20px] font-bold text-text-primary">
                                {searchQuery ? 'Search Results' : 'Containers'}
                            </h2>
                        </div>

                        {placeContainers.length === 0 ? (
                            <EmptyState
                                message="No containers in this place yet"
                                actionLabel="Add Your First Container"
                                onAction={() => setIsCreateContainerOpen(true)}
                            />
                        ) : (
                            <div className="flex flex-col gap-6">
                                {/* Groups Section */}
                                {placeGroups.length > 0 && (
                                    <div className="flex flex-col gap-3">
                                        {placeGroups.map((group) => {
                                            const groupContainers = filteredContainers.filter(c => c.groupId === group.id)
                                            if (searchQuery && groupContainers.length === 0) return null

                                            return (
                                                <div key={group.id} className="flex flex-col gap-3">
                                                    <div className="flex items-center justify-between px-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-display text-[18px] font-bold text-text-primary">
                                                                {group.name}
                                                            </h3>
                                                            <span className="text-sm text-text-tertiary">
                                                                ({groupContainers.length})
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => setEditingGroup(group)}
                                                            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                                                        >
                                                            <Pencil size={16} strokeWidth={2} />
                                                        </button>
                                                    </div>

                                                    <div className="pl-4 border-l-2 border-border-standard ml-2">
                                                        <div className="flex flex-col gap-3">
                                                            {groupContainers.map((container, index) => (
                                                                <Card
                                                                    key={container.id}
                                                                    variant="interactive"
                                                                    onClick={() => navigate(`/containers/${container.id}`)}
                                                                    className="flex items-center gap-[14px]"
                                                                >
                                                                    <IconBadge icon={Package} color={getContainerColor(index)} />
                                                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <h3 className="font-body text-[16px] font-semibold text-text-primary">
                                                                                {container.name}
                                                                            </h3>
                                                                            {container.qrCodeId && (
                                                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-aqua/10 rounded-full">
                                                                                    <QrCode size={12} className="text-accent-aqua" strokeWidth={2} />
                                                                                    <span className="text-[10px] font-medium text-accent-aqua">QR</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <p className="font-body text-[13px] text-text-secondary">
                                                                            {getContainerItemCount(container.id)} items · Last updated{' '}
                                                                            {(() => {
                                                                                const date = toDate(container.lastAccessed)
                                                                                const now = new Date()
                                                                                const diffMs = now.getTime() - date.getTime()
                                                                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                                                                                if (diffDays === 0) return 'today'
                                                                                if (diffDays === 1) return 'yesterday'
                                                                                return `${diffDays}d ago`
                                                                            })()}
                                                                        </p>
                                                                    </div>
                                                                    <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
                                                                </Card>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Ungrouped Containers */}
                                <div className="flex flex-col gap-3">
                                    {filteredContainers.filter(c => !c.groupId).map((container, index) => (
                                        <Card
                                            key={container.id}
                                            variant="interactive"
                                            onClick={() => navigate(`/containers/${container.id}`)}
                                            className="flex items-center gap-[14px]"
                                        >
                                            <IconBadge icon={Package} color={getContainerColor(index)} />
                                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-body text-[16px] font-semibold text-text-primary">
                                                        {container.name}
                                                    </h3>
                                                    {container.qrCodeId && (
                                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-aqua/10 rounded-full">
                                                            <QrCode size={12} className="text-accent-aqua" strokeWidth={2} />
                                                            <span className="text-[10px] font-medium text-accent-aqua">QR</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="font-body text-[13px] text-text-secondary">
                                                    {getContainerItemCount(container.id)} items · Last updated{' '}
                                                    {(() => {
                                                        const date = toDate(container.lastAccessed)
                                                        const now = new Date()
                                                        const diffMs = now.getTime() - date.getTime()
                                                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                                                        if (diffDays === 0) return 'today'
                                                        if (diffDays === 1) return 'yesterday'
                                                        return `${diffDays}d ago`
                                                    })()}
                                                </p>
                                            </div>
                                            <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Items Search Results */}
                {searchQuery && filteredItems.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="font-display text-[20px] font-bold text-text-primary">
                                Items ({filteredItems.length})
                            </h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            {filteredItems.map((item) => (
                                <Card
                                    key={item.id}
                                    variant="interactive"
                                    padding="sm"
                                    onClick={() => navigate(`/items/${item.id}`)}
                                >
                                    <div className="flex items-center gap-[14px]">
                                        {item.photos[0] ? (
                                            <img
                                                src={item.photos[0]}
                                                alt={item.name}
                                                className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 bg-bg-elevated rounded-xl flex items-center justify-center flex-shrink-0">
                                                <Package size={28} className="text-text-tertiary" strokeWidth={2} />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-body text-[16px] font-semibold text-text-primary truncate">
                                                    {item.name}
                                                </h3>
                                                {item.voiceNoteUrl && (
                                                    <Mic size={14} className="text-accent-aqua flex-shrink-0" />
                                                )}
                                            </div>
                                            {/* Show which container it's in */}
                                            <p className="font-body text-[13px] text-text-secondary line-clamp-1">
                                                in {placeContainers.find(c => c.id === item.containerId)?.name}
                                            </p>
                                            {item.tags.length > 0 && (
                                                <div className="flex gap-1 mt-1">
                                                    {item.tags.slice(0, 2).map((tag) => (
                                                        <Badge key={tag} variant="success" size="sm">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight size={20} className="text-text-tertiary flex-shrink-0" strokeWidth={2} />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

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
                    <ImageGrid
                        images={place.photos || []}
                        alt={place.name}
                        onImageClick={(index) => {
                            // Optional: Could open a full screen lightbox here
                            console.log('Clicked image index:', index)
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
