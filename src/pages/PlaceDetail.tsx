import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useInventoryStore } from '@/store/inventory'
import { CreateContainerModal, CreatePlaceModal, ConfirmDeleteModal } from '@/components'
import { useInventory } from '@/hooks'
import { deleteContainer, deletePlace } from '@/services/firebaseService'
import { Container } from '@/types'
import { ArrowLeft, MoreVertical, ChevronRight, Package, Plus } from 'lucide-react'

export function PlaceDetail() {
    const { id } = useParams<{ id: string }>()
    const user = useAuthStore((state) => state.user)
    const { refresh } = useInventory()
    const { places, containers, items } = useInventoryStore()
    const navigate = useNavigate()

    // Modal States
    const [isCreateContainerOpen, setIsCreateContainerOpen] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    // Place Actions
    const [isEditingPlace, setIsEditingPlace] = useState(false)
    const [isDeletingPlace, setIsDeletingPlace] = useState(false)
    const [isDeletePlaceConfirmOpen, setIsDeletePlaceConfirmOpen] = useState(false)

    // Container Actions
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
        // We could also map these to our tailwind safe-list or just use style objects for dynamic colors
        // For now, let's keep hex but maybe use the css vars if we wanted strictly tokens
        // But dynamic colors are often exceptions.
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
        <div className="p-4">
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
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="w-11 h-11 bg-bg-surface rounded-full flex items-center justify-center"
                    >
                        <MoreVertical size={20} className="text-text-primary" strokeWidth={2} />
                    </button>
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
                <div className="w-20 h-20 rounded-[24px] flex items-center justify-center bg-accent-teal">
                    <Package size={40} className="text-white" strokeWidth={2} />
                </div>
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
                    <button
                        onClick={() => setIsCreateContainerOpen(true)}
                        className="bg-accent-pink rounded-card px-[14px] py-2 flex items-center gap-1.5"
                    >
                        <Plus size={16} className="text-white" strokeWidth={2} />
                        <span className="font-body text-[13px] font-semibold text-white">Add</span>
                    </button>
                </div>

                {placeContainers.length === 0 ? (
                    <div className="bg-bg-surface rounded-card p-8 text-center">
                        <p className="font-body text-text-secondary mb-4">No containers in this place yet</p>
                        <button
                            onClick={() => setIsCreateContainerOpen(true)}
                            className="font-body text-[14px] font-semibold text-accent-pink"
                        >
                            Add Your First Container
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {placeContainers.map((container, index) => (
                            <div
                                key={container.id}
                                onClick={() => navigate(`/containers/${container.id}`)}
                                className="bg-bg-surface rounded-card p-4 flex items-center gap-[14px] cursor-pointer active:opacity-90 transition"
                            >
                                <div
                                    className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: getContainerColor(index) }}
                                >
                                    <Package size={28} className="text-white" strokeWidth={2} />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <h3 className="font-body text-[16px] font-semibold text-text-primary">
                                        {container.name}
                                    </h3>
                                    <p className="font-body text-[13px] text-text-secondary">
                                        {getContainerItemCount(container.id)} items · Last updated{' '}
                                        {(() => {
                                            const date = (container.lastAccessed as any)?.toDate?.() || new Date(container.lastAccessed as any)
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
                            </div>
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
