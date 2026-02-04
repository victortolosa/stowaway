import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { CreateItemModal, ConfirmDeleteModal, AudioPlayer, Breadcrumbs } from '@/components'
import { useItem } from '@/hooks/queries/useItems'
import { useContainer } from '@/hooks/queries/useContainers'
import { usePlace } from '@/hooks/queries/usePlaces'
import { useQueryClient } from '@tanstack/react-query'
import { ITEM_KEYS } from '@/hooks/queries/useItems'
import { CONTAINER_KEYS } from '@/hooks/queries/useContainers'
import { deleteItem, updateItem } from '@/services/firebaseService'
import { Trash2, Pencil, Plus } from 'lucide-react'
import { Button, Badge, LoadingState, NavigationHeader, ImageCarousel, Modal, GalleryEditor } from '@/components/ui'

export function Item() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: item, isLoading: isItemLoading } = useItem(id!)
  // Fetch container to get placeId and for navigation
  const { data: container } = useContainer(item?.containerId || '')
  const { data: place } = usePlace(container?.placeId || '')

  const isLoading = isItemLoading

  const refresh = async () => {
    if (!item) return
    await queryClient.invalidateQueries({ queryKey: ITEM_KEYS.detail(id!) })
    if (item.containerId) {
      await queryClient.invalidateQueries({ queryKey: CONTAINER_KEYS.detail(item.containerId) })
      await queryClient.invalidateQueries({ queryKey: ITEM_KEYS.byContainer(item.containerId) })
    }
  }

  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [showGallery, setShowGallery] = useState(false)

  if (!user || !id) {
    return <LoadingState />
  }

  if (isLoading) {
    return <LoadingState message="Loading item..." />
  }

  // item, container, place are already fetched via hooks

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
    <div className="pb-48">
      {/* Header */}
      <NavigationHeader
        backTo={`/containers/${container?.id}`}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              size="icon"
              className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
              onClick={() => setIsEditing(true)}
            >
              <Pencil size={18} className="text-text-primary" strokeWidth={2} />
            </Button>
            <Button
              variant="icon"
              size="icon"
              className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full text-accent-danger hover:bg-accent-danger/10"
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              <Trash2 size={18} strokeWidth={2} />
            </Button>
          </div>
        }
      />

      <div className="px-1 mb-4">
        <Breadcrumbs
          items={[
            { label: 'Places', path: '/places' },
            { label: place?.name || '...', path: `/places/${place?.id}` },
            { label: container?.name || '...', path: `/containers/${container?.id}` },
            { label: item.name }
          ]}
        />
      </div>

      {/* Hero Image */}
      <div className="relative h-[280px] bg-bg-elevated rounded-2xl overflow-hidden mx-4 shadow-sm border border-border-light">
        {item.photos && item.photos.length > 0 ? (
          <ImageCarousel
            images={item.photos}
            alt={item.name}
            className="h-full"
            onImageClick={() => setShowGallery(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-body text-text-tertiary">No photo</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-6 space-y-6">
        {/* Item Header */}
        <div className="space-y-2 px-4">
          <h1 className="font-display text-[28px] font-bold text-text-primary leading-tight">
            {item.name}
          </h1>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 px-4">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="primary" size="md">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Voice Note Section */}
        {item.voiceNoteUrl && (
          <div className="space-y-3 px-4">
            <h3 className="font-display text-base font-semibold text-text-primary">
              Voice Note
            </h3>
            <AudioPlayer audioUrl={item.voiceNoteUrl} />
          </div>
        )}

        {/* Description Section */}
        {item.description && (
          <div className="space-y-3 px-4">
            <h3 className="font-display text-base font-semibold text-text-primary">
              Description
            </h3>
            <p className="font-body text-[15px] text-text-secondary leading-relaxed">
              {item.description}
            </p>
          </div>
        )}

        {/* Actions Section */}
        <div className="space-y-3 pt-2 px-4">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            leftIcon={Plus}
          >
            Move to Different Container
          </Button>
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

      {/* Gallery Modal */}
      <Modal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        title="Photo Gallery"
        description={`${item.photos?.length || 0} photos`}
      >
        <div className="max-h-[60vh] overflow-y-auto p-1">
          <GalleryEditor
            images={item.photos || []}
            onUpdate={async (newImages) => {
              try {
                await updateItem(item.id, { photos: newImages })
                // Refresh item detail and parent container (if cover changed)
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
