import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'
import { CreateItemModal, CreateContainerModal, ConfirmDeleteModal } from '@/components'
import { QRLabelModal } from '@/components/QRLabelModal'
import { QRManageModal } from '@/components/QRManageModal'
import { deleteContainer, deleteItem } from '@/services/firebaseService'
import { Item } from '@/types'
import { ArrowLeft, Pencil, Trash2, ChevronRight, Package, Plus, Mic, QrCode } from 'lucide-react'
import { Button, Card, IconBadge, EmptyState, Badge } from '@/components/ui'

export function Container() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const { containers, items, places, refresh } = useInventory()
  const navigate = useNavigate()

  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false)
  const [showQRManageModal, setShowQRManageModal] = useState(false)
  const [showQRLabelModal, setShowQRLabelModal] = useState(false)

  const [isEditingContainer, setIsEditingContainer] = useState(false)
  const [isDeleteContainerConfirmOpen, setIsDeleteContainerConfirmOpen] = useState(false)
  const [isDeletingContainer, setIsDeletingContainer] = useState(false)

  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  if (!user || !id) {
    return <div>Loading...</div>
  }

  const container = containers.find((c) => c.id === id)
  const place = container ? places.find((p) => p.id === container.placeId) : null
  const containerItems = container ? items.filter((i) => i.containerId === container.id) : []

  if (!container) {
    return <div>Container not found</div>
  }

  const handleDeleteContainer = async () => {
    setIsDeletingContainer(true)
    try {
      await deleteContainer(container.id)
      navigate(`/places/${place?.id}`)
    } catch (error) {
      console.error('Failed to delete container:', error)
      setIsDeletingContainer(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!deletingItem) return
    setIsDeletingItem(true)
    try {
      await deleteItem(deletingItem.id)
      await refresh()
      setDeletingItem(null)
    } catch (error) {
      console.error('Failed to delete item:', error)
    } finally {
      setIsDeletingItem(false)
    }
  }

  const handleViewLabel = () => {
    setShowQRLabelModal(true)
  }

  return (
    <div className="flex flex-col h-full pb-48">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(`/places/${place?.id}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={24} className="text-text-primary" strokeWidth={2} />
          <span className="font-body text-base text-text-primary">{place?.name}</span>
        </button>
        <div className="flex items-center gap-3">
          <Button
            variant="icon"
            size="icon"
            className="w-11 h-11 bg-bg-surface rounded-full"
            onClick={() => setShowQRManageModal(true)}
          >
            <QrCode size={18} className="text-text-primary" strokeWidth={2} />
          </Button>
          <Button
            variant="icon"
            size="icon"
            className="w-11 h-11 bg-bg-surface rounded-full"
            onClick={() => setIsEditingContainer(true)}
          >
            <Pencil size={18} className="text-text-primary" strokeWidth={2} />
          </Button>
          <Button
            variant="icon"
            size="icon"
            className="w-11 h-11 bg-bg-surface rounded-full"
            onClick={() => setIsDeleteContainerConfirmOpen(true)}
          >
            <Trash2 size={18} className="text-text-primary" strokeWidth={2} />
          </Button>
        </div>
      </div>

      {/* Container Hero */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <IconBadge icon={Package} color="#3B82F6" size="lg" />
        <div className="text-center flex flex-col gap-1">
          <h1 className="font-display text-[28px] font-bold text-text-primary leading-tight">
            {container.name}
          </h1>
          <p className="font-body text-[14px] text-text-secondary">
            {containerItems.length} items · {place?.name}
          </p>
        </div>
      </div>

      {/* Items Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-[20px] font-bold text-text-primary">Items</h2>
          <Button
            variant="primary"
            size="sm"
            leftIcon={Plus}
            onClick={() => setIsCreateItemOpen(true)}
          >
            Add Item
          </Button>
        </div>

        {containerItems.length === 0 ? (
          <EmptyState
            message="No items in this container yet"
            actionLabel="Add your first item"
            onAction={() => setIsCreateItemOpen(true)}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {containerItems.map((item) => (
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
                    {item.description && (
                      <p className="font-body text-[13px] text-text-secondary line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex gap-1">
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
        )}
      </div>

      {/* Create Item Modal */}
      <CreateItemModal
        isOpen={isCreateItemOpen}
        onClose={() => setIsCreateItemOpen(false)}
        onItemCreated={() => {
          refresh()
          setIsCreateItemOpen(false)
        }}
        containerId={id}
      />

      {/* Edit Container Modal */}
      {isEditingContainer && (
        <CreateContainerModal
          isOpen={isEditingContainer}
          onClose={() => setIsEditingContainer(false)}
          onContainerCreated={() => {
            refresh()
            setIsEditingContainer(false)
          }}
          placeId={place?.id || ''}
          editMode
          initialData={container}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <CreateItemModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onItemCreated={() => {
            refresh()
            setEditingItem(null)
          }}
          containerId={id}
          editMode
          initialData={editingItem}
        />
      )}

      {/* Delete Container Confirmation */}
      <ConfirmDeleteModal
        isOpen={isDeleteContainerConfirmOpen}
        onClose={() => setIsDeleteContainerConfirmOpen(false)}
        onConfirm={handleDeleteContainer}
        title="Delete Container"
        message={`Are you sure you want to delete "${container.name}"? This action cannot be undone and will delete all items within it.`}
        isDeleting={isDeletingContainer}
      />

      {/* Delete Item Confirmation */}
      {deletingItem && (
        <ConfirmDeleteModal
          isOpen={!!deletingItem}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteItem}
          title="Delete Item"
          message={`Are you sure you want to delete "${deletingItem.name}"?`}
          isDeleting={isDeletingItem}
        />
      )}

      {/* QR Manage Modal */}
      <QRManageModal
        isOpen={showQRManageModal}
        onClose={() => setShowQRManageModal(false)}
        container={container}
        onRefresh={refresh}
        onViewLabel={handleViewLabel}
      />

      {/* QR Label Modal */}
      {place && (
        <QRLabelModal
          isOpen={showQRLabelModal}
          onClose={() => setShowQRLabelModal(false)}
          container={container}
          place={place}
        />
      )}
    </div>
  )
}
