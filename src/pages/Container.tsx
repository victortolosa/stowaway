import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useContainer } from '@/hooks/queries/useContainers'
import { useContainerItems } from '@/hooks/queries/useItems'
import { usePlace } from '@/hooks/queries/usePlaces'
import { useGroups } from '@/hooks/queries/useGroups'
import { useQueryClient } from '@tanstack/react-query'
import { CONTAINER_KEYS } from '@/hooks/queries/useContainers'
import { ITEM_KEYS } from '@/hooks/queries/useItems'
import { GROUP_KEYS } from '@/hooks/queries/useGroups'
import { CreateItemModal, CreateContainerModal, ConfirmDeleteModal, CreateGroupModal, Breadcrumbs } from '@/components'
import { QRLabelModal } from '@/components/QRLabelModal'
import { QRManageModal } from '@/components/QRManageModal'
import { updateContainer, deleteContainer, deleteItem, deleteGroup } from '@/services/firebaseService'
import { Item, Group } from '@/types'
import { Pencil, Trash2, Package, Plus, QrCode, Search, FolderPlus } from 'lucide-react'
import { IconBadge, EmptyState, LoadingState, Button, NavigationHeader, ImageCarousel, Modal, GalleryEditor } from '@/components/ui'
import { ItemCard } from '@/components/ItemCard'
import { useSearchFilter } from '@/hooks/useSearchFilter'

export function Container() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: container, isLoading: isContainerLoading } = useContainer(id!)
  const { data: items = [], isLoading: isItemsLoading } = useContainerItems(id!)
  const { data: groups = [], isLoading: isGroupsLoading } = useGroups()

  // We need place to show breadcrumbs.
  // container?.placeId might be undefined initially
  const { data: place } = usePlace(container?.placeId || '')

  const isLoading = isContainerLoading || isItemsLoading || isGroupsLoading

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: CONTAINER_KEYS.detail(id!) }),
      // Also invalidate list queries to ensure Dashboard is updated if we edit container name/photos
      queryClient.invalidateQueries({ queryKey: CONTAINER_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: ITEM_KEYS.byContainer(id!) }),
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.list(user?.uid || '') })
    ])
  }

  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [showQRManageModal, setShowQRManageModal] = useState(false)
  const [showQRLabelModal, setShowQRLabelModal] = useState(false)
  const [showGallery, setShowGallery] = useState(false)

  const [isEditingContainer, setIsEditingContainer] = useState(false)
  const [isDeleteContainerConfirmOpen, setIsDeleteContainerConfirmOpen] = useState(false)
  const [isDeletingContainer, setIsDeletingContainer] = useState(false)

  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const containerItems = items // Already filtered by hook
  const containerGroups = (groups || []).filter((g) => g.parentId === id && g.type === 'item')

  // Filter items based on search query
  const filteredItems = useSearchFilter({
    data: containerItems,
    searchQuery,
    searchKeys: ['name', 'description', 'tags']
  })

  if (!user || !id) {
    return <LoadingState />
  }

  if (isLoading) {
    return <LoadingState message="Loading container..." />
  }

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

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return
    setIsDeletingGroup(true)
    try {
      await deleteGroup(deletingGroup.id, 'item')
      await refresh()
      setDeletingGroup(null)
    } catch (error) {
      console.error('Failed to delete group:', error)
    } finally {
      setIsDeletingGroup(false)
    }
  }

  const handleViewLabel = () => {
    setShowQRLabelModal(true)
  }

  return (
    <div className="flex flex-col h-full pb-48 w-full max-w-full">
      {/* Header */}
      <NavigationHeader
        backTo={`/places/${place?.id}`}
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              size="icon"
              className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
              onClick={() => setShowQRManageModal(true)}
            >
              <QrCode size={18} className="text-text-primary" strokeWidth={2} />
            </Button>
            <Button
              variant="icon"
              size="icon"
              className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
              onClick={() => setIsEditingContainer(true)}
            >
              <Pencil size={18} className="text-text-primary" strokeWidth={2} />
            </Button>
            <Button
              variant="icon"
              size="icon"
              className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
              onClick={() => setIsDeleteContainerConfirmOpen(true)}
            >
              <Trash2 size={18} className="text-text-primary" strokeWidth={2} />
            </Button>
          </div>
        }
      />

      <div className="pb-2">
        <Breadcrumbs
          items={[
            { label: 'Places', path: '/places' },
            { label: place?.name || '...', path: `/places/${place?.id}` },
            { label: container.name }
          ]}
        />
      </div>

      {/* Container Hero */}
      {container.photos && container.photos.length > 0 ? (
        <div className="mb-6">
          <div className="rounded-2xl overflow-hidden aspect-[21/9] mb-6 shadow-sm border border-border-light bg-bg-surface">
            <ImageCarousel
              images={container.photos}
              alt={container.name}
              onImageClick={() => setShowGallery(true)}
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                Container
              </span>
              <h1 className="h1 text-text-primary">
                {container.name}
              </h1>
              <p className="text-body-sm text-text-secondary">
                {containerItems.length} items · {place?.name}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4 mb-8">
          <IconBadge icon={Package} color="var(--color-accent-blue)" size="md" />
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
              Container
            </span>
            <h1 className="h1 text-text-primary">
              {container.name}
            </h1>
            <p className="text-body-sm text-text-secondary">
              {containerItems.length} items · {place?.name}
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="bg-bg-surface rounded-xl h-[48px] px-4 flex items-center gap-3 shadow-sm border border-border-light focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
          <Search size={20} className="text-accent-aqua" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 font-body text-[15px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Quick Actions */}
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
            onClick={() => setIsCreateItemOpen(true)}
          >
            New Item
          </Button>
        </div>
      )}

      {/* Items Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="h2 text-text-primary">
              {searchQuery ? 'Search Results' : 'Items'}
            </h2>
          </div>

          {containerItems.length === 0 ? (
            <EmptyState
              message="No items in this container yet"
              actionLabel="Add Your First Item"
              onAction={() => setIsCreateItemOpen(true)}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {/* Groups Section */}
              {containerGroups.length > 0 && (
                <div className="flex flex-col gap-3">
                  {containerGroups.map((group) => {
                    const groupItems = filteredItems.filter(i => i.groupId === group.id)
                    if (searchQuery && groupItems.length === 0) return null

                    return (
                      <div key={group.id} className="flex flex-col gap-3">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-[18px] font-bold text-text-primary">
                              {group.name}
                            </h3>
                            <span className="text-sm text-text-tertiary">
                              ({groupItems.length})
                            </span>
                          </div>
                          <button
                            onClick={() => setEditingGroup(group)}
                            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                          >
                            <Pencil size={16} strokeWidth={2} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                          {groupItems.map((item) => (
                            <ItemCard
                              key={item.id}
                              item={item}
                              onClick={() => navigate(`/items/${item.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Ungrouped Items */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.filter(i => !i.groupId).map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => navigate(`/items/${item.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
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

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={refresh}
        type="item"
        parentId={id}
      />

      {/* Edit Group Modal */}
      {editingGroup && (
        <CreateGroupModal
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          onGroupCreated={refresh}
          type="item"
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
          message={`Are you sure you want to delete "${deletingGroup.name}"? The items inside will not be deleted.`}
          isDeleting={isDeletingGroup}
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

      {/* Gallery Modal */}
      <Modal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        title="Photo Gallery"
        description={`${container.photos?.length || 0} photos`}
      >
        <div className="max-h-[60vh] overflow-y-auto p-1">
          <GalleryEditor
            images={container.photos || []}
            onUpdate={async (newImages) => {
              try {
                await updateContainer(container.id, { photos: newImages })
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
