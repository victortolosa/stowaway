import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'
import { CreateItemModal, CreateContainerModal, ConfirmDeleteModal, CreateGroupModal, Breadcrumbs } from '@/components'
import { QRLabelModal } from '@/components/QRLabelModal'
import { QRManageModal } from '@/components/QRManageModal'
import { deleteContainer, deleteItem, deleteGroup } from '@/services/firebaseService'
import { Item, Group } from '@/types'
import { Pencil, Trash2, ChevronRight, Package, Plus, Mic, QrCode, Search, FolderPlus } from 'lucide-react'
import { IconBadge, EmptyState, LoadingState, Button, Card, NavigationHeader } from '@/components/ui'

export function Container() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const { containers, items, groups, places, isLoading, refresh } = useInventory()
  const navigate = useNavigate()

  const [isCreateItemOpen, setIsCreateItemOpen] = useState(false)
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
  const [showQRManageModal, setShowQRManageModal] = useState(false)
  const [showQRLabelModal, setShowQRLabelModal] = useState(false)

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

  if (!user || !id) {
    return <LoadingState />
  }

  if (isLoading) {
    return <LoadingState message="Loading container..." />
  }

  const container = containers.find((c) => c.id === id)
  const place = container ? places.find((p) => p.id === container.placeId) : null
  const containerItems = items.filter((i) => i.containerId === id)
  const containerGroups = (groups || []).filter((g) => g.parentId === id && g.type === 'item')

  // Filter items based on search query
  const filteredItems = containerItems.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

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
    <div className="flex flex-col h-full pb-48">
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

      <div className="px-1">
        <Breadcrumbs
          items={[
            { label: 'Places', path: '/places' },
            { label: place?.name || '...', path: `/places/${place?.id}` },
            { label: container.name }
          ]}
        />
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

      {/* Search Bar */}
      <div className="mb-4">
        <div className="bg-white rounded-xl h-[48px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
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
            onClick={() => setIsCreateItemOpen(true)}
          >
            New Item
          </Button>
        </div>
      )}

      {/* Items Section */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-[20px] font-bold text-text-primary">
              {searchQuery ? 'Search Results' : 'Organization'}
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

                        <div className="pl-4 border-l-2 border-border-standard ml-2">
                          <div className="flex flex-col gap-3">
                            {groupItems.map((item) => (
                              <Card
                                key={item.id}
                                variant="interactive"
                                className="flex items-center gap-[14px] p-3"
                                onClick={() => navigate(`/items/${item.id}`)}
                              >
                                <div className="w-12 h-12 bg-bg-surface rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-border-standard">
                                  {item.photos && item.photos.length > 0 ? (
                                    <img src={item.photos[0]} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={24} className="text-text-tertiary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                  <h3 className="font-body text-[16px] font-semibold text-text-primary truncate">
                                    {item.name}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    {item.tags && item.tags.length > 0 && (
                                      <span className="text-[12px] text-text-tertiary truncate">
                                        {item.tags.join(', ')}
                                      </span>
                                    )}
                                    {item.voiceNoteUrl && (
                                      <Mic size={14} className="text-accent-aqua" />
                                    )}
                                  </div>
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

              {/* Ungrouped Items */}
              <div className="grid grid-cols-1 gap-3">
                {filteredItems.filter(i => !i.groupId).map((item) => (
                  <Card
                    key={item.id}
                    variant="interactive"
                    className="flex items-center gap-[14px] p-3"
                    onClick={() => navigate(`/items/${item.id}`)}
                  >
                    <div className="w-12 h-12 bg-bg-surface rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-border-standard">
                      {item.photos && item.photos.length > 0 ? (
                        <img src={item.photos[0]} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={24} className="text-text-tertiary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <h3 className="font-body text-[16px] font-semibold text-text-primary truncate">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {item.tags && item.tags.length > 0 && (
                          <span className="text-[12px] text-text-tertiary truncate">
                            {item.tags.join(', ')}
                          </span>
                        )}
                        {item.voiceNoteUrl && (
                          <Mic size={14} className="text-accent-aqua" />
                        )}
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
                  </Card>
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
    </div>
  )
}
