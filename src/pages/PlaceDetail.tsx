import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useInventoryStore } from '@/store/inventory'
import { CreateContainerModal, CreatePlaceModal, ConfirmDeleteModal } from '@/components'
import { useInventory } from '@/hooks'
import { deleteContainer, deletePlace } from '@/services/firebaseService'
import { Container } from '@/types'
import { ArrowLeft, MoreVertical, ChevronRight, Package, Plus, QrCode } from 'lucide-react'
import { Button, Card, IconBadge, EmptyState } from '@/components/ui'
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
    const { refresh } = useInventory()
    const { places, containers, items } = useInventoryStore()
    const navigate = useNavigate()

    const [isCreateContainerOpen, setIsCreateContainerOpen] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    const [isEditingPlace, setIsEditingPlace] = useState(false)
    const [isDeletingPlace, setIsDeletingPlace] = useState(false)
    const [isDeletePlaceConfirmOpen, setIsDeletePlaceConfirmOpen] = useState(false)

    const [editingContainer, setEditingContainer] = useState<Container | null>(null)
    const [deletingContainer, setDeletingContainer] = useState<Container | null>(null)
    const [isDeletingContainer, setIsDeletingContainer] = useState(false)

    if (!user || !id) {
        return <div>Loading...</div>
    }

    const place = places.find((p) => p.id === id)
    const placeContainers = containers.filter((c) => c.placeId === id)

    if (!place) {
        return <div>Place not found</div>
    }

    const totalItems = items.filter((item) =>
        placeContainers.some((c) => c.id === item.containerId)
    ).length

    const getContainerColor = (index: number) => {
        const colors = ['#3B82F6', '#3B82F6', '#3B82F6', '#18181B', '#F59E0B']
        return colors[index % colors.length]
    }

    const getContainerItemCount = (containerId: string) => {
        return items.filter((item) => item.containerId === containerId).length
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

    return (
        <div className="flex flex-col h-full pb-48">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft size={24} className="text-text-primary" strokeWidth={2} />
                    <span className="font-body text-base text-text-primary">Back</span>
                </button>
                <div className="relative">
                    <Button
                        variant="icon"
                        size="icon"
                        className="w-11 h-11 bg-bg-surface rounded-full"
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
            </div>

            {/* Place Hero */}
            <div className="flex flex-col items-center gap-4 mb-6">
                <IconBadge icon={Package} color="#14B8A6" size="lg" />
                <div className="text-center flex flex-col gap-1">
                    <h1 className="font-display text-[28px] font-bold text-text-primary leading-tight">
                        {place.name}
                    </h1>
                    <p className="font-body text-[14px] text-text-secondary">
                        {placeContainers.length} containers · {totalItems} items
                    </p>
                </div>
            </div>

            {/* Containers Section */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="font-display text-[20px] font-bold text-text-primary">Containers</h2>
                    <Button
                        variant="primary"
                        size="sm"
                        leftIcon={Plus}
                        onClick={() => setIsCreateContainerOpen(true)}
                    >
                        Add Container
                    </Button>
                </div>

                {placeContainers.length === 0 ? (
                    <EmptyState
                        message="No containers in this place yet"
                        actionLabel="Add Your First Container"
                        onAction={() => setIsCreateContainerOpen(true)}
                    />
                ) : (
                    <div className="flex flex-col gap-3">
                        {placeContainers.map((container, index) => (
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
        </div>
    )
}
