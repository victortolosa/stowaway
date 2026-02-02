import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'
import { CreatePlaceModal, ConfirmDeleteModal } from '@/components'
import { useNavigate } from 'react-router-dom'
import { deletePlace } from '@/services/firebaseService'
import { Place } from '@/types'
import { Trash2, Home, Briefcase, Archive, MapPin, Search } from 'lucide-react'
import { PageHeader, ListItem, EmptyState, IconBadge } from '@/components/ui'

export function Places() {
  const user = useAuthStore((state) => state.user)
  const { places, containers, refresh } = useInventory()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredPlaces = places.filter((place) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const placeContainers = containers.filter((c) => c.placeId === place.id)
    return (
      place.name.toLowerCase().includes(query) ||
      place.type.toLowerCase().includes(query) ||
      placeContainers.some(c => c.name.toLowerCase().includes(query))
    )
  })

  return (
    <div className="flex flex-col h-full pb-48">
      <PageHeader
        title="Places"
        actionLabel="Add Place"
        onAction={() => setIsCreateModalOpen(true)}
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="bg-white rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
          <Search size={22} className="text-accent-aqua" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 font-body text-[16px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
          />
        </div>
      </div>

      {filteredPlaces.length === 0 ? (
        <EmptyState
          message={searchQuery ? 'No places found' : 'No places yet'}
          actionLabel={searchQuery ? undefined : 'Create Your First Place'}
          onAction={searchQuery ? undefined : () => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredPlaces.map((place, index) => {
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
                    className="p-3 text-text-tertiary hover:text-accent-danger transition-colors z-10"
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
