import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch, SearchDataItem } from '@/hooks'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { LoadingState } from '@/components/ui'
import { SearchFilterType } from '@/hooks/useSearch'
import { Item, Container, Place } from '@/types'
import { Search as SearchIcon, Package, Archive, MapPin, QrCode, Mic, Camera } from 'lucide-react'
import { Card, IconOrEmoji, Badge } from '@/components/ui'
import { Timestamp } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import { getPlaceIcon, getContainerIcon, getItemIcon } from '@/utils/colorUtils'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { useAuthStore } from '@/store/auth'
import { isPlaceShared } from '@/utils/placeUtils'

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

// Color and icon now come from database

export function Search() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  // Set global breadcrumbs
  useBreadcrumbs([{ label: 'Search', categoryPath: '/search' }])

  const { data: allPlaces = [], isLoading: isPlacesLoading } = usePlaces()
  const { data: allContainers = [], isLoading: isContainersLoading } = useAllContainers()
  const { data: allItems = [], isLoading: isItemsLoading } = useAllItems()

  const isLoading = isPlacesLoading || isContainersLoading || isItemsLoading

  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<SearchFilterType>('all')
  const [hasPhoto, setHasPhoto] = useState(false)
  const [hasAudio, setHasAudio] = useState(false)
  const [sharedOnly, setSharedOnly] = useState(false)

  const searchResults = useSearch(query, {
    items: allItems,
    containers: allContainers,
    places: allPlaces
  }, {
    filters: {
      type: filterType,
      hasPhoto,
      hasAudio
    }
  })

  // Prevent flash of empty content while loading initial data
  if (isLoading && !query) {
    return <LoadingState message="Preparing search..." />
  }

  // Group results for display
  const searchedItems = searchResults
    .filter((r): r is Extract<SearchDataItem, { type: 'item' }> => r.type === 'item')
    .map(r => r.item)

  const searchedContainers = searchResults
    .filter((r): r is Extract<SearchDataItem, { type: 'container' }> => r.type === 'container')
    .map(r => r.item)

  const searchedPlaces = searchResults
    .filter((r): r is Extract<SearchDataItem, { type: 'place' }> => r.type === 'place')
    .map(r => r.item)

  const isSharedPlaceId = (placeId?: string) => {
    if (!placeId) return false
    const place = allPlaces.find((p) => p.id === placeId)
    if (!place) return false
    return isPlaceShared(place, user?.uid)
  }

  const filteredItems = sharedOnly
    ? searchedItems.filter((item) => {
      const container = allContainers.find((c) => c.id === item.containerId)
      return isSharedPlaceId(container?.placeId)
    })
    : searchedItems

  const filteredContainers = sharedOnly
    ? searchedContainers.filter((container) => isSharedPlaceId(container.placeId))
    : searchedContainers

  const filteredPlaces = sharedOnly
    ? searchedPlaces.filter((place) => isPlaceShared(place, user?.uid))
    : searchedPlaces

  const searchedItemCount = filteredItems.length
  const searchedContainerCount = filteredContainers.length
  const searchedPlaceCount = filteredPlaces.length
  const totalResults = searchedItemCount + searchedContainerCount + searchedPlaceCount

  const getItemLocation = (itemId: string) => {
    const item = allItems.find((i) => i.id === itemId)
    if (!item) return ''
    const container = allContainers.find((c) => c.id === item.containerId)
    const place = allPlaces.find((p) => p.id === container?.placeId)
    return `${place?.name || ''} → ${container?.name || ''}`
  }

  return (
    <div className="pb-24">
      <div className="max-w-mobile mx-auto pt-2">
        {/* Search Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 bg-bg-surface rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-border-standard focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
            <SearchIcon size={22} className="text-accent-aqua" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Search everything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="font-body text-[16px] text-text-primary bg-transparent border-none outline-none flex-1 placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 px-1 -mx-1 mb-2">
          <FilterChip
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
          >
            All
          </FilterChip>
          <FilterChip
            active={filterType === 'item'}
            onClick={() => setFilterType('item')}
            icon={Package}
          >
            Items
          </FilterChip>
          <FilterChip
            active={filterType === 'container'}
            onClick={() => setFilterType('container')}
            icon={Archive}
          >
            Containers
          </FilterChip>
          <FilterChip
            active={filterType === 'place'}
            onClick={() => setFilterType('place')}
            icon={MapPin}
          >
            Places
          </FilterChip>
          <div className="w-[1px] h-8 bg-border-standard mx-1 flex-shrink-0" />
          <FilterChip
            active={hasPhoto}
            onClick={() => setHasPhoto(!hasPhoto)}
            icon={Camera}
          >
            Photo
          </FilterChip>
          <FilterChip
            active={hasAudio}
            onClick={() => setHasAudio(!hasAudio)}
            icon={Mic}
          >
            Audio
          </FilterChip>
          <FilterChip
            active={sharedOnly}
            onClick={() => setSharedOnly(!sharedOnly)}
            icon={MapPin}
          >
            Shared
          </FilterChip>
        </div>

        {/* Results Info */}
        {query.trim() && (
          <p className="font-body text-sm text-text-secondary mb-5 px-1">
            {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
          </p>
        )}

        {/* Results List */}
        <div className="space-y-6">
          {/* Items Section */}
          {filteredItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-[18px] font-bold text-text-primary">Items ({searchedItemCount})</h2>
              {filteredItems.map((item: Item) => (
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
                        <IconOrEmoji iconValue={item.icon} defaultIcon={getItemIcon()} color={item.color || '#3B82F6'} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-body text-[16px] font-semibold text-text-primary truncate flex-1">
                          {item.name}
                        </h3>
                        {item.voiceNoteUrl && (
                          <Mic size={14} className="text-accent-aqua flex-shrink-0" />
                        )}
                      </div>
                      <p className="font-body text-[13px] text-text-secondary truncate">
                        {getItemLocation(item.id)}
                      </p>
                      {item.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {item.tags.slice(0, 2).map((tag: string) => (
                            <Badge key={tag} variant="success" size="sm">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Containers Section */}
          {filteredContainers.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-[18px] font-bold text-text-primary">Containers ({searchedContainerCount})</h2>
              {filteredContainers.map((container: Container) => {
                const place = allPlaces.find(p => p.id === container.placeId)
                const itemCount = allItems.filter(item => item.containerId === container.id).length
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

          {/* Places Section */}
          {filteredPlaces.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-[18px] font-bold text-text-primary">Places ({searchedPlaceCount})</h2>
              {filteredPlaces.map((place: Place) => {
                const placeContainers = allContainers.filter((c) => c.placeId === place.id)
                const placeColor = place.color || '#14B8A6'
                const shared = isPlaceShared(place, user?.uid)

                return (
                  <Card
                    key={place.id}
                    variant="interactive"
                    onClick={() => navigate(`/places/${place.id}`)}
                    className="flex items-center gap-[14px]"
                  >
                    <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="font-body text-[16px] font-semibold text-text-primary truncate">
                          {place.name}
                        </h3>
                        {shared && (
                          <Badge size="sm" variant="info" className="flex-shrink-0">
                            Shared
                          </Badge>
                        )}
                      </div>
                      <p className="font-body text-[13px] text-text-secondary">
                        {placeContainers.length} container{placeContainers.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {query.trim() && totalResults === 0 && (
          <div className="text-center py-12">
            <p className="font-body text-text-secondary">No results found</p>
            <p className="font-body text-sm text-text-tertiary mt-2">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
  icon: Icon
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ElementType
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors border flex-shrink-0",
        active
          ? "bg-text-primary text-bg-page border-text-primary"
          : "bg-bg-surface text-text-secondary border-border-standard hover:border-text-tertiary"
      )}
    >
      {Icon && <Icon size={14} className={active ? "text-white" : "text-text-tertiary"} />}
      {children}
    </button>
  )
}
