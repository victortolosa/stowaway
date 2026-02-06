import { useCallback, useRef, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePlaces, PLACE_KEYS } from '@/hooks/queries/usePlaces'
import { useGroups } from '@/hooks/queries/useGroups'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useQueryClient } from '@tanstack/react-query'
import { CreatePlaceModal, ConfirmDeleteModal, CreateGroupModal } from '@/components'
import { useNavigate } from 'react-router-dom'
import { deletePlace, deleteGroup } from '@/services/firebaseService'
import { Place, Group } from '@/types'
import { Plus, Pencil, MoreVertical, Users } from 'lucide-react'
import { ListItem, EmptyState, LoadingState, Button, IconOrEmoji, SearchBar } from '@/components/ui'
import { getPlaceIcon } from '@/utils/colorUtils'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { SortOption, sortItems } from '@/utils/sortUtils'
import { SortDropdown } from '@/components/ui'
import { isPlaceShared, canEditPlace, getPlaceRole } from '@/utils/placeUtils'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'

interface PlaceCardActionsMenuProps {
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}

function PlaceCardActionsMenu({ canEdit, canDelete, onEdit, onDelete }: PlaceCardActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useOnClickOutside(menuRef, useCallback(() => setIsOpen(false), []))

  if (!canEdit && !canDelete) return null

  return (
    <div
      ref={menuRef}
      className="relative"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
        aria-label="Open place actions"
      >
        <MoreVertical size={20} strokeWidth={2} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-bg-page rounded-card shadow-card py-2 z-30 border border-border-standard">
          {canEdit && (
            <button
              onClick={() => {
                setIsOpen(false)
                onEdit()
              }}
              className="w-full px-4 py-2 text-left font-body text-sm text-text-primary hover:bg-bg-surface"
            >
              Edit Place
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => {
                setIsOpen(false)
                onDelete()
              }}
              className="w-full px-4 py-2 text-left font-body text-sm text-accent-danger hover:bg-bg-surface"
            >
              Delete Place
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function Places() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()

  const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
  const { data: containers = [] } = useAllContainers()
  const { data: groups = [] } = useGroups()

  const isLoading = isPlacesLoading

  const refresh = async () => {
    if (!user?.uid) return
    await queryClient.invalidateQueries({ queryKey: PLACE_KEYS.list(user.uid) })
  }

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [editingPlace, setEditingPlace] = useState<Place | null>(null)
  const [deletingPlace, setDeletingPlace] = useState<Place | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('recently-modified')

  const navigate = useNavigate()

  // Set global breadcrumbs
  useBreadcrumbs([{ label: 'All Places', category: 'PLACES', categoryPath: '/places' }])

  if (!user) {
    return <div>Please log in</div>
  }

  if (isLoading) {
    return <LoadingState message="Loading places..." />
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

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return
    setIsDeletingGroup(true)
    try {
      await deleteGroup(deletingGroup.id, 'place')
      await refresh()
      setDeletingGroup(null)
    } catch (error) {
      console.error('Failed to delete group:', error)
    } finally {
      setIsDeletingGroup(false)
    }
  }

  // Color and icon now come from database

  const filteredPlaces = sortItems(
    places.filter((place) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      const placeContainers = containers.filter((c) => c.placeId === place.id)
      return (
        place.name.toLowerCase().includes(query) ||

        placeContainers.some(c => c.name.toLowerCase().includes(query))
      )
    }),
    sortBy
  )

  const placeGroups = (groups || []).filter((g) => g && g.type === 'place' && g.parentId === null)
  const placeGroupIds = new Set(placeGroups.map((g) => g.id))
  const ungroupedPlaces = filteredPlaces.filter((place) => !place.groupId || !placeGroupIds.has(place.groupId))

  return (
    <div className="flex flex-col pb-48">

      {/* Title and Search Row */}
      <div className="flex items-center justify-between gap-4 mb-6 mt-2">
        <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
          Places
        </h1>
      </div>

      {/* Action Buttons and Sort */}
      <div className="flex flex-col gap-6 mb-8">
        <SearchBar
          placeholder="Search places..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <div className="flex justify-between items-center w-full">
          {!searchQuery ? (
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="sm"
                fullWidth
                leftIcon={Plus}
                onClick={() => setIsCreateModalOpen(true)}
              >
                New Place
              </Button>
            </div>
          ) : <div />}

          <div className="flex justify-end px-1">
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className={!searchQuery ? '' : 'mt-8'}>
        {filteredPlaces.length === 0 ? (
          <EmptyState
            message={searchQuery ? 'No places found' : 'No places yet'}
            actionLabel={searchQuery ? undefined : 'Create Your First Place'}
            onAction={searchQuery ? undefined : () => setIsCreateModalOpen(true)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Non-Empty Groups Section */}
            {placeGroups.filter(group => {
              const groupPlaces = filteredPlaces.filter(p => p.groupId === group.id)
              return groupPlaces.length > 0
            }).length > 0 && (
                <div className="flex flex-col gap-6">
                  {placeGroups.map((group) => {
                    const groupPlaces = filteredPlaces.filter(p => p.groupId === group.id)
                    if (groupPlaces.length === 0) return null
                    if (searchQuery && groupPlaces.length === 0) return null

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
                              ({groupPlaces.length})
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
                            {groupPlaces.map((place) => {
                              const placeContainers = containers.filter((c) => c.placeId === place.id)
                              const placeColor = place.color || '#14B8A6'
                              const shared = isPlaceShared(place, user?.uid)
                              const canEdit = canEditPlace(place, user?.uid)
                              const canDelete = getPlaceRole(place, user?.uid) === 'owner'

                              return (
                                <ListItem
                                  key={place.id}
                                  title={place.name}
                                  subtitle={`${placeContainers.length} container${placeContainers.length !== 1 ? 's' : ''}`}
                                  showChevron={false}
                                  leftContent={
                                    <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} />
                                  }
                                  rightContent={shared ? (
                                    <span
                                      className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent-blue/20 text-accent-blue flex-shrink-0"
                                      aria-label="Shared"
                                    >
                                      <Users size={12} strokeWidth={2.5} />
                                    </span>
                                  ) : undefined}
                                  actions={
                                    <PlaceCardActionsMenu
                                      canEdit={canEdit}
                                      canDelete={canDelete}
                                      onEdit={() => setEditingPlace(place)}
                                      onDelete={() => setDeletingPlace(place)}
                                    />
                                  }
                                  onClick={() => navigate(`/places/${place.id}`)}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            {/* Ungrouped Places */}
            {ungroupedPlaces.length > 0 && (
              <div className="flex flex-col gap-3">
                {placeGroups.length > 0 && (
                  <h3 className="font-display text-[16px] font-semibold text-text-secondary px-1">
                    Ungrouped
                  </h3>
                )}
                {ungroupedPlaces.map((place) => {
                  const placeContainers = containers.filter((c) => c.placeId === place.id)
                  const placeColor = place.color || '#14B8A6'
                  const shared = isPlaceShared(place, user?.uid)
                  const canEdit = canEditPlace(place, user?.uid)
                  const canDelete = getPlaceRole(place, user?.uid) === 'owner'

                  return (
                    <ListItem
                      key={place.id}
                      title={place.name}
                      subtitle={`${placeContainers.length} container${placeContainers.length !== 1 ? 's' : ''}`}
                      showChevron={false}
                      leftContent={
                        <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} />
                      }
                      rightContent={shared ? (
                        <span
                          className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent-blue/20 text-accent-blue flex-shrink-0"
                          aria-label="Shared"
                        >
                          <Users size={12} strokeWidth={2.5} />
                        </span>
                      ) : undefined}
                      actions={
                        <PlaceCardActionsMenu
                          canEdit={canEdit}
                          canDelete={canDelete}
                          onEdit={() => setEditingPlace(place)}
                          onDelete={() => setDeletingPlace(place)}
                        />
                      }
                      onClick={() => navigate(`/places/${place.id}`)}
                    />
                  )
                })}
              </div>
            )}

            {/* Empty Groups */}
            {placeGroups.filter(group => {
              const groupPlaces = filteredPlaces.filter(p => p.groupId === group.id)
              return groupPlaces.length === 0
            }).length > 0 && !searchQuery && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-display text-[16px] font-semibold text-text-secondary px-1">
                    Empty Groups
                  </h3>
                  {placeGroups.map((group) => {
                    const groupPlaces = filteredPlaces.filter(p => p.groupId === group.id)
                    if (groupPlaces.length > 0) return null

                    return (
                      <div key={group.id} className="flex items-center justify-between px-1 py-2 rounded-lg hover:bg-bg-surface transition-colors">
                        <div
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all flex-1"
                          onClick={() => navigate(`/groups/${group.id}`)}
                        >
                          <h3 className="font-body text-[15px] text-text-secondary">
                            {group.name}
                          </h3>
                          <span className="text-xs text-text-tertiary">
                            (0)
                          </span>
                        </div>
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                        >
                          <Pencil size={16} strokeWidth={2} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
          </div>
        )}
      </div>

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



      {/* Edit Group Modal */}
      {editingGroup && (
        <CreateGroupModal
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          onGroupCreated={refresh}
          type="place"
          parentId={null}
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
          message={`Are you sure you want to delete "${deletingGroup.name}"? The places inside will not be deleted.`}
          isDeleting={isDeletingGroup}
        />
      )}
    </div>
  )
}
