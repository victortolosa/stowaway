import { useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { useContainer } from '@/hooks/queries/useContainers'
import { useContainerItems } from '@/hooks/queries/useItems'
import { usePlace } from '@/hooks/queries/usePlaces'
import { useGroups } from '@/hooks/queries/useGroups'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { CONTAINER_KEYS } from '@/hooks/queries/useContainers'
import { ITEM_KEYS } from '@/hooks/queries/useItems'
import { GROUP_KEYS } from '@/hooks/queries/useGroups'
import { CreateItemModal, CreateContainerModal, ConfirmDeleteModal, CreateGroupModal } from '@/components'
import { QRLabelModal } from '@/components/QRLabelModal'
import { QRManageModal } from '@/components/QRManageModal'
import { updateContainer, deleteContainer, deleteItem, deleteGroup } from '@/services/firebaseService'
import { Item, Group } from '@/types'
import { Pencil, Plus, QrCode, Search, FolderPlus, Activity, MoreVertical } from 'lucide-react'
import { IconOrEmoji, EmptyState, LoadingState, Button, NavigationHeader, ImageCarousel, Modal, GalleryEditor, ImageGrid } from '@/components/ui'
import { ItemCard } from '@/components/ItemCard'
import { ActivityFeed } from '@/components/ActivityFeed'
import { useSearchFilter } from '@/hooks/useSearchFilter'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { getContainerIcon, DEFAULT_CONTAINER_COLOR } from '@/utils/colorUtils'
import { getContainerAggregatedActivity } from '@/services/firebaseService'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'

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
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.all })
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
  const [isCreateSiblingContainerOpen, setIsCreateSiblingContainerOpen] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(menuRef, useCallback(() => setShowMenu(false), []))

  const { data: activityData = [], isLoading: isActivityLoading, error: activityError } = useQuery({
    queryKey: ['activity', 'container-aggregated', id],
    queryFn: () => getContainerAggregatedActivity(id!),
    enabled: showActivityModal && !!id,
    staleTime: 1000 * 60,
    retry: false,
  })

  const containerItems = items // Already filtered by hook
  const containerGroups = (groups || []).filter((g) => g.parentId === id && g.type === 'item')

  // Filter items based on search query
  const filteredItems = useSearchFilter({
    data: containerItems,
    searchQuery,
    searchKeys: ['name', 'description', 'tags']
  })

  // Set global breadcrumbs
  useBreadcrumbs([
    { label: place?.name || '...', path: `/places/${place?.id}`, category: 'PLACES', categoryPath: '/places' },
    { label: container?.name || '...', category: 'CONTAINERS', categoryPath: '/containers', groupId: container?.groupId || undefined, type: 'container' }
  ])

  if (!id) {
    return <div>Invalid URL — no container ID provided</div>
  }

  if (!user || isLoading) {
    return <LoadingState message="Loading container..." />
  }

  if (!container) {
    return <div>Container not found</div>
  }

  const ownerId = place?.ownerId || place?.userId
  const role = ownerId && user ? (place?.memberRoles?.[user.uid] || (user.uid === ownerId ? 'owner' : 'viewer')) : 'viewer'
  const canEdit = role === 'owner' || role === 'editor'

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
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              size="icon"
              className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
              onClick={() => setShowActivityModal(true)}
            >
              <Activity size={18} className="text-text-primary" strokeWidth={2} />
            </Button>
            {canEdit && (
              <>
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
                  onClick={() => setIsCreateSiblingContainerOpen(true)}
                >
                  <Plus size={18} className="text-text-primary" strokeWidth={2} />
                </Button>
                <div className="relative" ref={menuRef}>
                  <Button
                    variant="icon"
                    size="icon"
                    className="w-10 h-10 bg-transparent hover:bg-bg-surface rounded-full"
                    onClick={() => setShowMenu((prev) => !prev)}
                  >
                    <MoreVertical size={18} className="text-text-primary" strokeWidth={2} />
                  </Button>
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-44 bg-bg-page rounded-card shadow-card py-2 z-10 border border-border-standard">
                      <button
                        onClick={() => {
                          setIsEditingContainer(true)
                          setShowMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-text-primary hover:bg-bg-surface"
                      >
                        Edit Container
                      </button>
                      <button
                        onClick={() => {
                          setIsDeleteContainerConfirmOpen(true)
                          setShowMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-accent-danger hover:bg-bg-surface"
                      >
                        Delete Container
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        }
      />

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
            <div className="flex flex-col">
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
          <IconOrEmoji iconValue={container.icon} defaultIcon={getContainerIcon()} color={container.color || DEFAULT_CONTAINER_COLOR} size="md" />
          <div className="flex flex-col">
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
      {!searchQuery && canEdit && (
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
              actionLabel={canEdit ? "Add Your First Item" : undefined}
              onAction={canEdit ? () => setIsCreateItemOpen(true) : undefined}
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
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all"
                            onClick={() => navigate(`/groups/${group.id}`)}
                          >
                            <h3 className="font-display text-[18px] font-bold text-text-primary">
                              {group.name}
                            </h3>
                            <span className="text-sm text-text-tertiary">
                              ({groupItems.length})
                            </span>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => setEditingGroup(group)}
                              className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                            >
                              <Pencil size={16} strokeWidth={2} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4">
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
              <div className="grid grid-cols-1 gap-4">
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
      {canEdit && (
        <CreateItemModal
          isOpen={isCreateItemOpen}
          onClose={() => setIsCreateItemOpen(false)}
          onItemCreated={() => {
            refresh()
            setIsCreateItemOpen(false)
          }}
          containerId={id}
        />
      )}

      {/* Edit Container Modal */}
      {canEdit && isEditingContainer && (
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

      {/* Create Sibling Container Modal */}
      {canEdit && (
        <CreateContainerModal
          isOpen={isCreateSiblingContainerOpen}
          onClose={() => setIsCreateSiblingContainerOpen(false)}
          onContainerCreated={() => {
            refresh()
            setIsCreateSiblingContainerOpen(false)
          }}
          placeId={place?.id || ''}
          preselectedGroupId={container.groupId}
        />
      )}

      {/* Edit Item Modal */}
      {canEdit && editingItem && (
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
      {canEdit && (
        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => setIsCreateGroupOpen(false)}
          onGroupCreated={refresh}
          type="item"
          parentId={id}
        />
      )}

      {/* Edit Group Modal */}
      {canEdit && editingGroup && (
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
      {canEdit && deletingGroup && (
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
      {canEdit && (
        <ConfirmDeleteModal
          isOpen={isDeleteContainerConfirmOpen}
          onClose={() => setIsDeleteContainerConfirmOpen(false)}
          onConfirm={handleDeleteContainer}
          title="Delete Container"
          message={`Are you sure you want to delete "${container.name}"? This action cannot be undone and will delete all items within it.`}
          isDeleting={isDeletingContainer}
        />
      )}

      {/* Delete Item Confirmation */}
      {canEdit && deletingItem && (
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
      {canEdit && (
        <QRManageModal
          isOpen={showQRManageModal}
          onClose={() => setShowQRManageModal(false)}
          container={container}
          onRefresh={refresh}
          onViewLabel={handleViewLabel}
        />
      )}

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
          {canEdit ? (
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
          ) : (
            <ImageGrid images={container.photos || []} />
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setShowGallery(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Activity"
        description="All activity in this container"
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <ActivityFeed
            activities={activityData}
            isLoading={isActivityLoading}
            error={activityError as Error | null}
          />
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setShowActivityModal(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  )
}
