import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePlaces, PLACE_KEYS } from '@/hooks/queries/usePlaces'
import { useGroups } from '@/hooks/queries/useGroups'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useQueryClient } from '@tanstack/react-query'
import { CreatePlaceModal, ConfirmDeleteModal, CreateGroupModal } from '@/components'
import { useNavigate } from 'react-router-dom'
import { deletePlace, deleteGroup } from '@/services/firebaseService'
import { Place, Group } from '@/types'
import { Trash2, Search, FolderPlus, Plus, Pencil } from 'lucide-react'
import { ListItem, EmptyState, LoadingState, Button, IconOrEmoji } from '@/components/ui'
import { getPlaceIcon } from '@/utils/colorUtils'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { SortOption, sortItems } from '@/utils/sortUtils'
import { SortDropdown } from '@/components/ui'

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
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false)
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
        place.type.toLowerCase().includes(query) ||
        placeContainers.some(c => c.name.toLowerCase().includes(query))
      )
    }),
    sortBy
  )

  const placeGroups = (groups || []).filter((g) => g && g.type === 'place' && g.parentId === null)

  return (
    <div className="flex flex-col pb-48">

      {/* Title and Search Row */}
      <div className="flex items-center justify-between gap-4 mb-6 mt-2">
        <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
          Places
        </h1>
        <div className="flex-1 max-w-md">
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
      </div>

      {/* Action Buttons and Sort */}
      <div className="flex flex-col gap-6 mb-8">
        {!searchQuery && (
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
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              leftIcon={FolderPlus}
              onClick={() => setIsCreateGroupOpen(true)}
            >
              New Group
            </Button>
          </div>
        )}

        <div className="flex justify-end px-1">
          <SortDropdown value={sortBy} onChange={setSortBy} />
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

                              return (
                                <ListItem
                                  key={place.id}
                                  title={place.name}
                                  subtitle={`${placeContainers.length} container${placeContainers.length !== 1 ? 's' : ''}`}
                                  leftContent={
                                    <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} />
                                  }
                                  actions={
                                    <div className="flex items-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingPlace(place)
                                        }}
                                        className="p-3 text-text-tertiary hover:text-text-primary transition-colors z-10"
                                      >
                                        <Pencil size={20} strokeWidth={2} />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setDeletingPlace(place)
                                        }}
                                        className="p-3 text-text-tertiary hover:text-accent-danger transition-colors z-10"
                                      >
                                        <Trash2 size={20} strokeWidth={2} />
                                      </button>
                                    </div>
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
            {filteredPlaces.filter(p => !p.groupId).length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-[16px] font-semibold text-text-secondary px-1">
                  Ungrouped
                </h3>
                {filteredPlaces.filter(p => !p.groupId).map((place) => {
                  const placeContainers = containers.filter((c) => c.placeId === place.id)
                  const placeColor = place.color || '#14B8A6'

                  return (
                    <ListItem
                      key={place.id}
                      title={place.name}
                      subtitle={`${placeContainers.length} container${placeContainers.length !== 1 ? 's' : ''}`}
                      leftContent={
                        <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} />
                      }
                      actions={
                        <div className="flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingPlace(place)
                            }}
                            className="p-3 text-text-tertiary hover:text-text-primary transition-colors z-10"
                          >
                            <Pencil size={20} strokeWidth={2} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingPlace(place)
                            }}
                            className="p-3 text-text-tertiary hover:text-accent-danger transition-colors z-10"
                          >
                            <Trash2 size={20} strokeWidth={2} />
                          </button>
                        </div>
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

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={refresh}
        type="place"
        parentId={null}
      />

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
