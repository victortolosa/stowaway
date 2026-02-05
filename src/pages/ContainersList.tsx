import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { useGroups } from '@/hooks/queries/useGroups'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Search, QrCode, Plus, FolderPlus } from 'lucide-react'
import { Card, EmptyState, LoadingState, Button, IconOrEmoji } from '@/components/ui'
import { MultiStepCreateContainerModal, SelectContainersForGroupModal } from '@/components'
import { Timestamp } from 'firebase/firestore'
import { getContainerIcon } from '@/utils/colorUtils'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { SortOption, sortItems } from '@/utils/sortUtils'
import { SortDropdown } from '@/components/ui'

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

export function ContainersList() {
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const { data: containers = [], isLoading: isContainersLoading } = useAllContainers()
  const { data: items = [] } = useAllItems()
  const { data: places = [] } = usePlaces()
  const { data: groups = [] } = useGroups()

  const isLoading = isContainersLoading
  const [searchQuery, setSearchQuery] = useState('')
  const [isMultiStepCreateOpen, setIsMultiStepCreateOpen] = useState(false)
  const [isSelectContainersGroupOpen, setIsSelectContainersGroupOpen] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('recently-modified')
  const navigate = useNavigate()

  // Set global breadcrumbs
  useBreadcrumbs([{ label: 'All Containers', category: 'CONTAINERS', categoryPath: '/containers' }])

  const containerGroups = (groups || []).filter((g) => g && g.type === 'container')

  if (!user) {
    return <div>Please log in</div>
  }

  if (isLoading) {
    return <LoadingState message="Loading containers..." />
  }

  // Color and icon now come from database

  const getContainerItemCount = (containerId: string) => {
    return items.filter((item) => item.containerId === containerId).length
  }

  const filteredContainers = sortItems(
    containers.filter((container) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      const place = places.find(p => p.id === container.placeId)
      return (
        container.name.toLowerCase().includes(query) ||
        place?.name.toLowerCase().includes(query)
      )
    }),
    sortBy
  )

  return (
    <div className="flex flex-col pb-48">

      {/* Title and Search Row */}
      <div className="flex items-center justify-between gap-4 mb-6 mt-2">
        <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
          Containers
        </h1>
        <div className="flex-1 max-w-md">
          <div className="bg-white rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
            <Search size={22} className="text-accent-aqua" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search containers..."
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
            New Container
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            leftIcon={FolderPlus}
            onClick={() => setIsSelectContainersGroupOpen(true)}
          >
            New Group
          </Button>
          <div className="flex justify-end px-1">
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>
      )}

      {/* Content Section */}
      <div className={!searchQuery ? '' : 'mt-8'}>
        {filteredContainers.length === 0 ? (
          <EmptyState
            message={searchQuery ? 'No containers found' : 'No containers yet'}
            actionLabel={searchQuery ? undefined : 'Add your first container'}
            onAction={searchQuery ? undefined : () => navigate('/places')}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {/* Non-Empty Groups Section */}
            {containerGroups.filter(group => {
              const groupContainers = filteredContainers.filter(c => c.groupId === group.id)
              return groupContainers.length > 0
            }).length > 0 && (
                <div className="flex flex-col gap-6">
                  {containerGroups.map((group) => {
                    const groupContainers = filteredContainers.filter(c => c.groupId === group.id)
                    if (groupContainers.length === 0) return null
                    if (searchQuery && groupContainers.length === 0) return null

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
                            ({groupContainers.length})
                          </span>
                        </div>

                        <div className="pl-4 border-l-2 border-border-standard ml-2">
                          <div className="flex flex-col gap-3">
                            {groupContainers.map((container) => {
                              const place = places.find(p => p.id === container.placeId)
                              const itemCount = getContainerItemCount(container.id)
                              const containerColor = container.color || '#3B82F6'

                              return (
                                <Card
                                  key={container.id}
                                  variant="interactive"
                                  onClick={() => navigate(`/containers/${container.id}`)}
                                  className="flex items-center gap-[14px]"
                                >
                                  <IconOrEmoji iconValue={container.icon} defaultIcon={getContainerIcon()} color={containerColor} />
                                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-body text-[16px] font-semibold text-text-primary">
                                        {container.name}
                                      </h3>
                                      {container.qrCodeId && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-aqua/10 rounded-full">
                                          <QrCode size={12} className="text-accent-aqua" strokeWidth={2} />
                                          <span className="text-[10px] font-medium text-accent-aqua">QR</span>
                                        </div>
                                      )}
                                    </div>
                                    <p className="font-body text-[13px] text-text-secondary">
                                      {place?.name} · {itemCount} items · Last updated{' '}
                                      {(() => {
                                        const date = toDate(container.lastAccessed)
                                        const now = new Date()
                                        const diffMs = now.getTime() - date.getTime()
                                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                                        if (diffDays === 0) return 'today'
                                        if (diffDays === 1) return 'yesterday'
                                        return `${diffDays}d ago`
                                      })()}
                                    </p>
                                  </div>
                                </Card>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

            {/* Ungrouped Containers */}
            {filteredContainers.filter(c => !c.groupId).length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-[16px] font-semibold text-text-secondary px-1">
                  Ungrouped
                </h3>
                {filteredContainers.filter(c => !c.groupId).map((container) => {
                  const place = places.find(p => p.id === container.placeId)
                  const itemCount = getContainerItemCount(container.id)
                  const containerColor = container.color || '#3B82F6'

                  return (
                    <Card
                      key={container.id}
                      variant="interactive"
                      onClick={() => navigate(`/containers/${container.id}`)}
                      className="flex items-center gap-[14px]"
                    >
                      <IconOrEmoji iconValue={container.icon} defaultIcon={getContainerIcon()} color={containerColor} />
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-body text-[16px] font-semibold text-text-primary">
                            {container.name}
                          </h3>
                          {container.qrCodeId && (
                            <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-aqua/10 rounded-full">
                              <QrCode size={12} className="text-accent-aqua" strokeWidth={2} />
                              <span className="text-[10px] font-medium text-accent-aqua">QR</span>
                            </div>
                          )}
                        </div>
                        <p className="font-body text-[13px] text-text-secondary">
                          {place?.name} · {itemCount} items · Last updated{' '}
                          {(() => {
                            const date = toDate(container.lastAccessed)
                            const now = new Date()
                            const diffMs = now.getTime() - date.getTime()
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                            if (diffDays === 0) return 'today'
                            if (diffDays === 1) return 'yesterday'
                            return `${diffDays}d ago`
                          })()}
                        </p>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Empty Groups */}
            {containerGroups.filter(group => {
              const groupContainers = filteredContainers.filter(c => c.groupId === group.id)
              return groupContainers.length === 0
            }).length > 0 && !searchQuery && (
                <div className="flex flex-col gap-3">
                  <h3 className="font-display text-[16px] font-semibold text-text-secondary px-1">
                    Empty Groups
                  </h3>
                  {containerGroups.map((group) => {
                    const groupContainers = filteredContainers.filter(c => c.groupId === group.id)
                    if (groupContainers.length > 0) return null

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

      <MultiStepCreateContainerModal
        isOpen={isMultiStepCreateOpen}
        onClose={() => setIsMultiStepCreateOpen(false)}
        onContainerCreated={() => {
          setIsMultiStepCreateOpen(false)
          queryClient.invalidateQueries({ queryKey: ['containers'] })
        }}
      />

      <SelectContainersForGroupModal
        isOpen={isSelectContainersGroupOpen}
        onClose={() => setIsSelectContainersGroupOpen(false)}
        onGroupCreated={() => {
          setIsSelectContainersGroupOpen(false)
          queryClient.invalidateQueries({ queryKey: ['groups'] })
          queryClient.invalidateQueries({ queryKey: ['containers'] })
        }}
      />
    </div>
  )
}
