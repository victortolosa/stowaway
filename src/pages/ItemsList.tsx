import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { useGroups } from '@/hooks/queries/useGroups'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Plus, FolderPlus } from 'lucide-react'
import { EmptyState, LoadingState, Button } from '@/components/ui'
import { ItemCard } from '@/components/ItemCard'
import { ObjectViewTabs, MultiStepCreateItemModal, SelectItemsForGroupModal } from '@/components'




export function ItemsList() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { data: items = [], isLoading: isItemsLoading } = useAllItems()
  const { data: containers = [] } = useAllContainers()
  const { data: places = [] } = usePlaces()
  const { data: groups = [] } = useGroups()

  const isLoading = isItemsLoading
  const [searchQuery, setSearchQuery] = useState('')
  const [isMultiStepCreateOpen, setIsMultiStepCreateOpen] = useState(false)
  const [isSelectItemsGroupOpen, setIsSelectItemsGroupOpen] = useState(false)
  const navigate = useNavigate()

  const itemGroups = (groups || []).filter((g) => g && g.type === 'item')

  if (!user) {
    return <div>Please log in</div>
  }

  if (isLoading) {
    return <LoadingState message="Loading items..." />
  }

  const getItemLocation = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return ''
    const container = containers.find(c => c.id === item.containerId)
    const place = places.find(p => p.id === container?.placeId)
    return `${place?.name || ''} → ${container?.name || ''}`
  }

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const location = getItemLocation(item.id).toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query)) ||
      location.includes(query)
    )
  })

  return (
    <div className="flex flex-col pb-48">
      <ObjectViewTabs />

      {/* Title and Search Row */}
      <div className="flex items-center justify-between gap-4 mb-6 mt-2">
        <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
          Items
        </h1>
        <div className="flex-1 max-w-md">
          <div className="bg-white rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
            <Search size={22} className="text-accent-aqua" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 font-body text-[16px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!searchQuery && (
        <div className="flex gap-3 mb-8">
          <Button
            variant="primary"
            size="sm"
            fullWidth
            leftIcon={Plus}
            onClick={() => setIsMultiStepCreateOpen(true)}
          >
            New Item
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            leftIcon={FolderPlus}
            onClick={() => setIsSelectItemsGroupOpen(true)}
          >
            New Group
          </Button>
        </div>
      )}

      {/* Content Section */}
      <div className={!searchQuery ? '' : 'mt-8'}>
        {filteredItems.length === 0 ? (
        <EmptyState
          message={searchQuery ? 'No items found' : 'No items yet'}
          actionLabel={searchQuery ? undefined : 'Add your first item'}
          onAction={searchQuery ? undefined : () => navigate('/places')}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Non-Empty Groups Section */}
          {itemGroups.filter(group => {
            const groupItems = filteredItems.filter(i => i.groupId === group.id)
            return groupItems.length > 0
          }).length > 0 && (
            <div className="flex flex-col gap-6">
              {itemGroups.map((group) => {
                const groupItems = filteredItems.filter(i => i.groupId === group.id)
                if (groupItems.length === 0) return null
                if (searchQuery && groupItems.length === 0) return null

                return (
                  <div key={group.id} className="flex flex-col gap-3">
                    <div
                      className="flex items-center gap-2 px-1 cursor-pointer hover:opacity-80 transition-all"
                      onClick={() => navigate(`/groups/${group.id}`)}
                    >
                      <h3 className="font-display text-[18px] font-bold text-text-primary">
                        {group.name}
                      </h3>
                      <span className="text-sm text-text-tertiary">
                        ({groupItems.length})
                      </span>
                    </div>

                    <div className="pl-4 border-l-2 border-border-standard ml-2">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupItems.map((item) => (
                          <ItemCard
                            key={item.id}
                            item={item}
                            location={getItemLocation(item.id)}
                            onClick={() => navigate(`/items/${item.id}`)}
                            showDate={true}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Ungrouped Items */}
          {filteredItems.filter(i => !i.groupId).length > 0 && (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-[16px] font-semibold text-text-secondary px-1">
                Ungrouped
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.filter(i => !i.groupId).map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    location={getItemLocation(item.id)}
                    onClick={() => navigate(`/items/${item.id}`)}
                    showDate={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty Groups */}
          {itemGroups.filter(group => {
            const groupItems = filteredItems.filter(i => i.groupId === group.id)
            return groupItems.length === 0
          }).length > 0 && !searchQuery && (
            <div className="flex flex-col gap-3">
              <h3 className="font-display text-[16px] font-semibold text-text-secondary px-1">
                Empty Groups
              </h3>
              {itemGroups.map((group) => {
                const groupItems = filteredItems.filter(i => i.groupId === group.id)
                if (groupItems.length > 0) return null

                return (
                  <div
                    key={group.id}
                    className="flex items-center gap-2 px-1 py-2 rounded-lg hover:bg-bg-surface transition-colors cursor-pointer"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <h3 className="font-body text-[15px] text-text-secondary">
                      {group.name}
                    </h3>
                    <span className="text-xs text-text-tertiary">
                      (0)
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      </div>

      <MultiStepCreateItemModal
        isOpen={isMultiStepCreateOpen}
        onClose={() => setIsMultiStepCreateOpen(false)}
        onItemCreated={() => {
          setIsMultiStepCreateOpen(false)
          queryClient.invalidateQueries({ queryKey: ['items'] })
        }}
      />

      <SelectItemsForGroupModal
        isOpen={isSelectItemsGroupOpen}
        onClose={() => setIsSelectItemsGroupOpen(false)}
        onGroupCreated={() => {
          setIsSelectItemsGroupOpen(false)
          queryClient.invalidateQueries({ queryKey: ['groups'] })
          queryClient.invalidateQueries({ queryKey: ['items'] })
        }}
      />
    </div>
  )
}
