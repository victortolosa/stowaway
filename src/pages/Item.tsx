import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useInventoryStore } from '@/store/inventory'
import { CreateItemModal, ConfirmDeleteModal, AudioPlayer } from '@/components'
import { useInventory } from '@/hooks'
import { deleteItem } from '@/services/firebaseService'
import { ArrowLeft, ChevronRight, Pencil, Plus } from 'lucide-react'

/**
 * Item Detail - View full item information and metadata
 * Shows:
 * - Item photo hero section
 * - Item name and location breadcrumb
 * - Tags
 * - Voice notes (if any)
 * - Description
 * - Move/Edit actions
 */
export function Item() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const { items, containers, places } = useInventoryStore()
  const { refresh } = useInventory()
  const navigate = useNavigate()

  // Modal States
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  if (!user || !id) {
    return <div>Loading...</div>
  }

  const item = items.find((i) => i.id === id)
  const container = item ? containers.find((c) => c.id === item.containerId) : null
  const place = container ? places.find((p) => p.id === container.placeId) : null

  if (!item) {
    return <div>Item not found</div>
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteItem(item.id)
      await refresh()
      navigate(`/containers/${container?.id}`)
    } catch (error) {
      console.error('Failed to delete item:', error)
      setIsDeleting(false)
    }
  }

  return (
    <div className="pb-6">
      {/* Hero Image */}
      <div className="relative h-[280px] bg-bg-elevated">
        {item.photos[0] ? (
          <img
            src={item.photos[0]}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-body text-text-tertiary">No photo</span>
          </div>
        )}
        {/* Back Button */}
        <button
          onClick={() => navigate(`/containers/${container?.id}`)}
          className="absolute top-4 left-6 w-11 h-11 bg-bg-page rounded-full flex items-center justify-center shadow-floating"
        >
          <ArrowLeft size={24} className="text-text-primary" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-6 space-y-6">
        {/* Item Header */}
        <div className="space-y-2">
          <h1 className="font-display text-[24px] font-bold text-text-primary leading-tight">
            {item.name}
          </h1>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-body text-text-secondary">{place?.name}</span>
            <ChevronRight size={14} className="text-text-tertiary" />
            <span className="font-body text-text-secondary">{container?.name}</span>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-accent-pink/10 text-accent-pink px-3 py-1 rounded-md font-body text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Voice Note Section */}
        {item.voiceNoteUrl && (
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold text-text-primary">
              Voice Note
            </h3>
            <AudioPlayer audioUrl={item.voiceNoteUrl} />
          </div>
        )}

        {/* Description Section */}
        {item.description && (
          <div className="space-y-3">
            <h3 className="font-display text-base font-semibold text-text-primary">
              Description
            </h3>
            <p className="font-body text-[15px] text-text-secondary leading-relaxed">
              {item.description}
            </p>
          </div>
        )}

        {/* Actions Section */}
        <div className="space-y-3 pt-2">
          <button className="w-full bg-bg-surface rounded-button h-[52px] px-5 flex items-center justify-center gap-3">
            <Plus size={20} className="text-text-primary" />
            <span className="font-body text-base font-medium text-text-primary">
              Move to Different Container
            </span>
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="w-full bg-accent-pink rounded-button h-[52px] px-5 flex items-center justify-center gap-3"
          >
            <Pencil size={20} className="text-text-on-accent" />
            <span className="font-body text-base font-semibold text-text-on-accent">
              Edit Item
            </span>
          </button>
        </div>
      </div>

      {/* Edit Item Modal */}
      {isEditing && (
        <CreateItemModal
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onItemCreated={() => {
            refresh()
            setIsEditing(false)
          }}
          containerId={container?.id || ''}
          editMode
          initialData={item}
        />
      )}

      {/* Delete Item Confirmation */}
      <ConfirmDeleteModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${item.name}"?`}
        isDeleting={isDeleting}
      />
    </div>
  )
}
