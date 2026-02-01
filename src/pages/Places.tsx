import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'
import { CreatePlaceModal, ConfirmDeleteModal } from '@/components'
import { useNavigate } from 'react-router-dom'
import { deletePlace } from '@/services/firebaseService'
import { Place } from '@/types'
import { Trash2, Home, Briefcase, Archive, MapPin } from 'lucide-react'
import { PageHeader, ListItem, EmptyState, IconBadge } from '@/components/ui'

export function Places() {
  const user = useAuthStore((state) => state.user)
  const { places, containers, refresh } = useInventory()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [editingPlace, setEditingPlace] = useState<Place | null>(null)

  const [deletingPlace, setDeletingPlace] = useState<Place | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const navigate = useNavigate()

  if (!user) {
    return <div>Please log in</div>
  }

  const handleDelete = async () => {
    if (!deletingPlace) return
    setIsDeleting(true)
    try {
      await deletePlace(deletingPlace.id)
      await refresh()
      setDeletingPlace(null)
    } catch (error) {
      console.error('Failed to delete place:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'home': return Home
      case 'office': return Briefcase
      case 'storage': return Archive
      default: return MapPin
    }
  }

  const getPlaceColor = (index: number) => {
    const colors = ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6']
    return colors[index % colors.length]
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Places"
        actionLabel="Add"
        onAction={() => setIsCreateModalOpen(true)}
      />

      {places.length === 0 ? (
        <EmptyState
          message="No places yet"
          actionLabel="Create Your First Place"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {places.map((place, index) => {
            const placeContainers = containers.filter((c) => c.placeId === place.id)
            const PlaceIcon = getPlaceIcon(place.type)

            return (
              <ListItem
                key={place.id}
                title={place.name}
                subtitle={`${placeContainers.length} container${placeContainers.length !== 1 ? 's' : ''}`}
                leftContent={
                  <IconBadge icon={PlaceIcon} color={getPlaceColor(index)} />
                }
                actions={
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingPlace(place)
                    }}
                    className="p-2 text-text-tertiary hover:text-accent-danger transition-colors z-10"
                  >
                    <Trash2 size={20} strokeWidth={2} />
                  </button>
                }
                onClick={() => navigate(`/places/${place.id}`)}
              />
            )
          })}
        </div>
      )}

      <CreatePlaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPlaceCreated={() => {
          refresh()
          setIsCreateModalOpen(false)
        }}
      />

      {editingPlace && (
        <CreatePlaceModal
          isOpen={!!editingPlace}
          onClose={() => setEditingPlace(null)}
          onPlaceCreated={() => {
            refresh()
            setEditingPlace(null)
          }}
          editMode
          initialData={editingPlace}
        />
      )}

      {deletingPlace && (
        <ConfirmDeleteModal
          isOpen={!!deletingPlace}
          onClose={() => setDeletingPlace(null)}
          onConfirm={handleDelete}
          title="Delete Place"
          message={`Are you sure you want to delete "${deletingPlace.name}"? This will also delete all containers and items within it.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  )
}
