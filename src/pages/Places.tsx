import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'
import { CreatePlaceModal, ConfirmDeleteModal } from '@/components'
import { useNavigate } from 'react-router-dom'
import { deletePlace } from '@/services/firebaseService'
import { Place } from '@/types'
import { Trash2, Plus, ChevronRight, Home, Briefcase, Archive, MapPin } from 'lucide-react'

export function Places() {
  const user = useAuthStore((state) => state.user)
  const { places, containers, refresh } = useInventory()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Edit State
  const [editingPlace, setEditingPlace] = useState<Place | null>(null)

  // Delete State
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
    <div className="p-5">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-[28px] font-bold text-text-primary">Places</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-accent-pink rounded-button px-[14px] py-2 flex items-center gap-1.5"
        >
          <Plus size={16} className="text-white" strokeWidth={2} />
          <span className="font-body text-[13px] font-semibold text-white">Add</span>
        </button>
      </div>

      {places.length === 0 ? (
        <div className="bg-bg-surface rounded-card p-8 text-center">
          <p className="font-body text-text-secondary mb-4">No places yet</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="font-body text-[14px] font-semibold text-accent-pink"
          >
            Create Your First Place
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {places.map((place, index) => {
            const placeContainers = containers.filter((c) => c.placeId === place.id)
            const PlaceIcon = getPlaceIcon(place.type)

            return (
              <div
                key={place.id}
                onClick={() => navigate(`/places/${place.id}`)}
                className="bg-bg-surface rounded-card p-4 flex items-center gap-[14px] cursor-pointer active:opacity-90 transition relative group"
              >
                <div
                  className="w-14 h-14 rounded-[14px] flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getPlaceColor(index) }}
                >
                  <PlaceIcon size={28} className="text-white" strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h3 className="font-body text-[16px] font-semibold text-text-primary">
                    {place.name}
                  </h3>
                  <p className="font-body text-[13px] text-text-secondary">
                    {placeContainers.length} container{placeContainers.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeletingPlace(place)
                  }}
                  className="p-2 text-text-tertiary hover:text-accent-danger transition-colors z-10"
                >
                  <Trash2 size={20} className="" strokeWidth={2} />
                </button>

                <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
              </div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreatePlaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPlaceCreated={() => {
          refresh()
          setIsCreateModalOpen(false)
        }}
      />

      {/* Edit Modal - Triggered from inside PlaceDetail generally, but kept here for now if we want to add "Edit" action to list later */}
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

      {/* Delete Confirmation */}
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
