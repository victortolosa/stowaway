import { useCallback, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { CreateItemModal, ConfirmDeleteModal, AudioPlayer } from '@/components'
import { useItem } from '@/hooks/queries/useItems'
import { useContainer } from '@/hooks/queries/useContainers'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { usePlace, usePlaces } from '@/hooks/queries/usePlaces'
import { useGroups } from '@/hooks/queries/useGroups'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { ITEM_KEYS } from '@/hooks/queries/useItems'
import { CONTAINER_KEYS } from '@/hooks/queries/useContainers'
import { deleteItem, updateItem, createContainer, createGroup } from '@/services/firebaseService'
import { Plus, Activity, MoreVertical } from 'lucide-react'
import { Button, Badge, LoadingState, NavigationHeader, ImageCarousel, Modal, GalleryEditor, ImageGrid, EmojiPicker, Select, FormField, Input, IconOrEmoji } from '@/components/ui'
import { ActivityFeed } from '@/components/ActivityFeed'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { getEntityActivity } from '@/services/firebaseService'
import { getItemIcon, DEFAULT_ITEM_COLOR, DEFAULT_CONTAINER_COLOR } from '@/utils/colorUtils'
import { canEditPlace } from '@/utils/placeUtils'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'

export function Item() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: item, isLoading: isItemLoading } = useItem(id!)
  // Fetch container to get placeId and for navigation
  const { data: container, isLoading: isContainerLoading } = useContainer(item?.containerId || '')
  const { data: place, isLoading: isPlaceLoading } = usePlace(container?.placeId || '')
  const { data: allContainers = [] } = useAllContainers()
  const { data: groups = [] } = useGroups()
  const { data: allPlaces = [] } = usePlaces()

  const isLoading = isItemLoading || isContainerLoading || isPlaceLoading
  const canEdit = place ? canEditPlace(place, user?.uid) : false
  const editablePlaces = allPlaces.filter((p) => canEditPlace(p, user?.uid))
  const editablePlaceIds = new Set(editablePlaces.map((p) => p.id))
  const editableContainers = allContainers.filter((c) => editablePlaceIds.has(c.placeId))

  const refresh = async () => {
    if (!item) return
    // Invalidate everything related to this item and its container
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ITEM_KEYS.detail(id!) }),
      queryClient.invalidateQueries({ queryKey: ITEM_KEYS.all }),
      item.containerId ? queryClient.invalidateQueries({ queryKey: CONTAINER_KEYS.detail(item.containerId) }) : Promise.resolve(),
      item.containerId ? queryClient.invalidateQueries({ queryKey: ITEM_KEYS.byContainer(item.containerId) }) : Promise.resolve(),
    ])
  }

  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [isCreateSiblingItemOpen, setIsCreateSiblingItemOpen] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMoveContainerModal, setShowMoveContainerModal] = useState(false)
  const [showMoveGroupModal, setShowMoveGroupModal] = useState(false)
  const [selectedContainerId, setSelectedContainerId] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [isMoving, setIsMoving] = useState(false)
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [isCreatingNewContainer, setIsCreatingNewContainer] = useState(false)
  const [newContainerName, setNewContainerName] = useState('')
  const [newContainerPlaceId, setNewContainerPlaceId] = useState('')
  const [isUpdatingIcon, setIsUpdatingIcon] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(menuRef, useCallback(() => setShowMenu(false), []))

  const { data: activityData = [], isLoading: isActivityLoading, error: activityError } = useQuery({
    queryKey: ['activity', 'entity', 'item', id],
    queryFn: () => getEntityActivity('item', id!),
    enabled: showActivityModal && !!id,
    staleTime: 1000 * 60,
    retry: false,
  })

  // Get item groups for current container
  const itemGroups = groups.filter(g => g.type === 'item' && g.parentId === item?.containerId)

  // Set global breadcrumbs
  useBreadcrumbs([
    { label: place?.name || '...', path: `/places/${place?.id}`, category: 'PLACES', categoryPath: '/places' },
    { label: container?.name || '...', path: `/containers/${container?.id}`, category: 'CONTAINERS', categoryPath: '/containers' },
    { label: item?.name || '...', category: 'ITEMS', categoryPath: '/items', groupId: item?.groupId || undefined, type: 'item' }
  ])

  if (!id) {
    return <div>Invalid URL — no item ID provided</div>
  }

  if (!user || isLoading) {
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
                  onClick={() => setIsCreateSiblingItemOpen(true)}
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
                    <div className="absolute right-0 mt-2 w-40 bg-bg-page rounded-card shadow-card py-2 z-10 border border-border-standard">
                      <button
                        onClick={() => {
                          setIsEditing(true)
                          setShowMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-text-primary hover:bg-bg-surface"
                      >
                        Edit Item
                      </button>
                      <button
                        onClick={() => {
                          setIsDeleteConfirmOpen(true)
                          setShowMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left font-body text-sm text-accent-danger hover:bg-bg-surface"
                      >
                        Delete Item
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Hero Image */}
      <div className={`relative ${item.photos && item.photos.length > 0 ? 'h-[280px]' : 'h-[160px]'} bg-bg-elevated rounded-2xl overflow-hidden mx-4 shadow-sm border border-border-light`}>
        {item.photos && item.photos.length > 0 ? (
          <ImageCarousel
            images={item.photos}
            alt={item.name}
            className="h-full"
            onImageClick={() => setShowGallery(true)}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center transition-colors ${canEdit ? 'cursor-pointer hover:bg-bg-surface' : ''}`}
            onClick={canEdit ? () => setShowEmojiPicker(true) : undefined}
          >
            <div className="flex flex-col items-center gap-3">
              <IconOrEmoji
                iconValue={item.icon}
                defaultIcon={getItemIcon()}
                color={item.color || DEFAULT_ITEM_COLOR}
                size="lg"
              />
              {canEdit && (
                <span className="font-body text-sm text-text-tertiary">Tap to change icon</span>
              )}
            </div>
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

          {/* Quantity Display */}
          {item.quantity !== undefined && item.quantity !== null && (
            <div className="flex items-center gap-2 pt-1">
              <span className="font-body text-sm text-text-tertiary">Quantity:</span>
              <span className="font-display text-lg font-semibold text-text-primary">{item.quantity}</span>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
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
        {canEdit && (
          <div className="space-y-3 pt-2 px-4">
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              leftIcon={Plus}
              onClick={() => {
                setSelectedContainerId(item.containerId)
                setShowMoveContainerModal(true)
              }}
            >
              Move to Different Container
            </Button>

            <Button
              variant="secondary"
              size="lg"
              fullWidth
              leftIcon={Plus}
              onClick={() => {
                setSelectedGroupId(item.groupId || '')
                setShowMoveGroupModal(true)
              }}
            >
              {item.groupId ? 'Move to Different Group' : 'Move to Group'}
            </Button>
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {canEdit && isEditing && (
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

      {/* Create Sibling Item Modal */}
      {canEdit && (
        <CreateItemModal
          isOpen={isCreateSiblingItemOpen}
          onClose={() => setIsCreateSiblingItemOpen(false)}
          onItemCreated={() => {
            refresh()
            setIsCreateSiblingItemOpen(false)
          }}
          containerId={container?.id || ''}
          preselectedGroupId={item.groupId}
        />
      )}

      {/* Delete Item Confirmation */}
      {canEdit && (
        <ConfirmDeleteModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setIsDeleteConfirmOpen(false)}
          onConfirm={handleDelete}
          title="Delete Item"
          message={`Are you sure you want to delete "${item.name}"?`}
          isDeleting={isDeleting}
        />
      )}

      {/* Gallery Modal */}
      <Modal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        title="Photo Gallery"
        description={`${item.photos?.length || 0} photos`}
      >
        <div className="max-h-[60vh] overflow-y-auto p-1">
          {canEdit ? (
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
          ) : (
            <ImageGrid images={item.photos || []} />
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setShowGallery(false)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Emoji Picker Modal */}
      {canEdit && (
        <Modal
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          title="Change Item Icon"
          description="Select a new icon for this item"
        >
          <div className="space-y-4">
            <EmojiPicker
              selectedEmoji={item.icon}
              onEmojiSelect={async (emoji) => {
                if (isUpdatingIcon) return
                setIsUpdatingIcon(true)
                try {
                  await updateItem(item.id, { icon: emoji })
                  await refresh()
                  setShowEmojiPicker(false)
                } catch (error) {
                  console.error('Failed to update icon:', error)
                  alert('Failed to update icon')
                } finally {
                  setIsUpdatingIcon(false)
                }
              }}
            />

            {item.icon && (
              <div className="pt-3 border-t border-border-light">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (isUpdatingIcon) return
                    setIsUpdatingIcon(true)
                    try {
                      await updateItem(item.id, { icon: '' })
                      await refresh()
                      setShowEmojiPicker(false)
                    } catch (error) {
                      console.error('Failed to reset icon:', error)
                      alert('Failed to reset icon')
                    } finally {
                      setIsUpdatingIcon(false)
                    }
                  }}
                  className="w-full"
                  disabled={isUpdatingIcon}
                >
                  Reset to Default Icon
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Move to Container Modal */}
      {canEdit && (
        <Modal
          isOpen={showMoveContainerModal}
          onClose={() => {
            setShowMoveContainerModal(false)
            setIsCreatingNewContainer(false)
            setNewContainerName('')
            setNewContainerPlaceId('')
          }}
          title="Move to Different Container"
          description="Select a container to move this item to"
        >
          <div className="space-y-4">
            {!isCreatingNewContainer ? (
              <>
                <FormField label="Container" htmlFor="container-select">
                  <Select
                    id="container-select"
                    value={selectedContainerId}
                    onChange={(e) => setSelectedContainerId(e.target.value)}
                  >
                    <option value="">Select a container</option>
                    {editableContainers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => {
                    setIsCreatingNewContainer(true)
                    setNewContainerPlaceId(place?.id || '')
                  }}
                >
                  + Create New Container
                </Button>
              </>
            ) : (
              <>
                <FormField label="Container Name" htmlFor="new-container-name">
                  <Input
                    id="new-container-name"
                    type="text"
                    placeholder="Enter container name"
                    value={newContainerName}
                    onChange={(e) => setNewContainerName(e.target.value)}
                    autoFocus
                  />
                </FormField>

                <FormField label="Place" htmlFor="place-select">
                  <Select
                    id="place-select"
                    value={newContainerPlaceId}
                    onChange={(e) => setNewContainerPlaceId(e.target.value)}
                  >
                    <option value="">Select a place</option>
                    {editablePlaces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (isCreatingNewContainer) {
                    setIsCreatingNewContainer(false)
                    setNewContainerName('')
                    setNewContainerPlaceId('')
                  } else {
                    setShowMoveContainerModal(false)
                  }
                }}
              >
                {isCreatingNewContainer ? 'Back' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  setIsMoving(true)
                  try {
                    if (isCreatingNewContainer) {
                      // Create new container
                      if (!newContainerName.trim() || !newContainerPlaceId) {
                        alert('Please enter a container name and select a place')
                        setIsMoving(false)
                        return
                      }
                      const newContainerId = await createContainer({
                        name: newContainerName,
                        placeId: newContainerPlaceId,
                        color: DEFAULT_CONTAINER_COLOR,
                        // Icon will be set to default via getContainerIcon() when displayed
                        lastAccessed: new Date(),
                      })
                      // Move item to new container
                      await updateItem(item.id, { containerId: newContainerId })
                      await refresh()
                      setNewContainerName('')
                      setNewContainerPlaceId('')
                      setIsCreatingNewContainer(false)
                      setShowMoveContainerModal(false)
                      navigate(`/containers/${newContainerId}`)
                    } else {
                      // Move to selected container
                      if (!selectedContainerId || selectedContainerId === item.containerId) return
                      await updateItem(item.id, { containerId: selectedContainerId })
                      await refresh()
                      setShowMoveContainerModal(false)
                      navigate(`/containers/${selectedContainerId}`)
                    }
                  } catch (error) {
                    console.error('Failed to move item:', error)
                    alert('Failed to move item')
                  } finally {
                    setIsMoving(false)
                  }
                }}
                disabled={isMoving || (!isCreatingNewContainer && (!selectedContainerId || selectedContainerId === item.containerId)) || (isCreatingNewContainer && (!newContainerName.trim() || !newContainerPlaceId))}
              >
                {isMoving ? 'Saving...' : isCreatingNewContainer ? 'Create & Move' : 'Move Item'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        title="Activity"
        description="Activity for this item"
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

      {/* Move to Group Modal */}
      {canEdit && (
        <Modal
          isOpen={showMoveGroupModal}
          onClose={() => {
            setShowMoveGroupModal(false)
            setIsCreatingNewGroup(false)
            setNewGroupName('')
          }}
          title={item.groupId ? 'Move to Different Group' : 'Move to Group'}
          description="Select a group for this item"
        >
          <div className="space-y-4">
            {!isCreatingNewGroup ? (
              <>
                <FormField label="Group" htmlFor="group-select">
                  <Select
                    id="group-select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    <option value="">None (Top Level)</option>
                    {itemGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsCreatingNewGroup(true)}
                >
                  + Create New Group
                </Button>
              </>
            ) : (
              <FormField label="New Group Name" htmlFor="new-group-name">
                <Input
                  id="new-group-name"
                  type="text"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                />
              </FormField>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (isCreatingNewGroup) {
                    setIsCreatingNewGroup(false)
                    setNewGroupName('')
                  } else {
                    setShowMoveGroupModal(false)
                  }
                }}
              >
                {isCreatingNewGroup ? 'Back' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={async () => {
                  setIsMoving(true)
                  try {
                    if (isCreatingNewGroup) {
                      // Create new group
                      if (!newGroupName.trim()) {
                        alert('Please enter a group name')
                        setIsMoving(false)
                        return
                      }
                      const newGroupId = await createGroup({
                        name: newGroupName,
                        type: 'item',
                        parentId: item.containerId,
                      })
                      // Move item to new group
                      await updateItem(item.id, { groupId: newGroupId })
                      await refresh()
                      setNewGroupName('')
                      setIsCreatingNewGroup(false)
                      setShowMoveGroupModal(false)
                    } else {
                      // Move to selected group
                      await updateItem(item.id, { groupId: selectedGroupId || null })
                      await refresh()
                      setShowMoveGroupModal(false)
                    }
                  } catch (error) {
                    console.error('Failed to move item to group:', error)
                    alert('Failed to move item to group')
                  } finally {
                    setIsMoving(false)
                  }
                }}
                disabled={isMoving || (isCreatingNewGroup && !newGroupName.trim())}
              >
                {isMoving ? 'Saving...' : isCreatingNewGroup ? 'Create & Move' : 'Save'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
