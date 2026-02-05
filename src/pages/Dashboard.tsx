import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
// We use useAllItems for client-side filtering/sorting and counts
import { useAllItems } from '@/hooks/queries/useAllItems'
import { Plus, ChevronRight, ChevronDown, User } from 'lucide-react'
import { Button, LoadingState, Card, EmptyState, IconOrEmoji } from '@/components'
import { ItemCard } from '@/components/ItemCard'
import { Timestamp } from 'firebase/firestore'
import { getPlaceIcon, getContainerIcon } from '@/utils/colorUtils'

type SortOption = 'recently-added' | 'oldest-first' | 'a-z' | 'z-a' | 'recently-modified'

// Helper to convert Firestore Timestamp to Date (Internal to Dashboard for sorting)
const toDateSync = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

export function Dashboard() {
  const navigate = useNavigate()

  const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
  const { data: containers = [], isLoading: isContainersLoading } = useAllContainers()
  const { data: allItems = [], isLoading: isAllItemsLoading } = useAllItems()

  const isLoading = isPlacesLoading || isContainersLoading || isAllItemsLoading

  const [showItemsSortMenu, setShowItemsSortMenu] = useState(false)
  const [showContainersSortMenu, setShowContainersSortMenu] = useState(false)
  const [showPlacesSortMenu, setShowPlacesSortMenu] = useState(false)
  const [itemsSortBy, setItemsSortBy] = useState<SortOption>('recently-added')
  const [containersSortBy, setContainersSortBy] = useState<SortOption>('recently-modified')
  const [placesSortBy, setPlacesSortBy] = useState<SortOption>('recently-modified')
  const [visibleItemsCount, setVisibleItemsCount] = useState(8)


  // Dashboard usually doesn't need auto-refresh on mount if RQ staleTime is configured,
  // but let's keep it simple.

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.sort-dropdown')) {
        setShowItemsSortMenu(false)
        setShowContainersSortMenu(false)
        setShowPlacesSortMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Color and icon now come from database

  const getSortLabel = (sortOption: SortOption): string => {
    switch (sortOption) {
      case 'recently-added': return 'Recently Added'
      case 'recently-modified': return 'Recently Modified'
      case 'oldest-first': return 'Oldest First'
      case 'a-z': return 'A-Z'
      case 'z-a': return 'Z-A'
    }
  }

  const sortItems = <T extends { name: string; createdAt: Date | Timestamp; lastAccessed?: Date | Timestamp }>(
    items: T[],
    sortBy: SortOption
  ): T[] => {
    const sorted = [...items]
    switch (sortBy) {
      case 'recently-added':
        return sorted.sort((a, b) => {
          const dateA = toDateSync(a.createdAt)
          const dateB = toDateSync(b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })
      case 'recently-modified':
        return sorted.sort((a, b) => {
          const dateA = toDateSync(a.lastAccessed || a.createdAt)
          const dateB = toDateSync(b.lastAccessed || b.createdAt)
          return dateB.getTime() - dateA.getTime()
        })
      case 'oldest-first':
        return sorted.sort((a, b) => {
          const dateA = toDateSync(a.createdAt)
          const dateB = toDateSync(b.createdAt)
          return dateA.getTime() - dateB.getTime()
        })
      case 'a-z':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'z-a':
        return sorted.sort((a, b) => b.name.localeCompare(a.name))
    }
  }

  // We will use 'recentItems' from hook for the "Recently Added" section default.
  // But the existing code sorts 'items' (which was all items).
  // If we only fetch 20 recent items, sorting by "Oldest First" on that subset is weird.
  // But for full feature parity, we are fetching `allItems`.
  // So we can use `allItems` for the sort logic.
  const itemsToDisplay = allItems

  const allRecentItems = sortItems([...itemsToDisplay], itemsSortBy)
  const recentItems = allRecentItems.slice(0, visibleItemsCount)
  const hasMoreItems = allRecentItems.length > visibleItemsCount

  const loadMoreItems = () => {
    setVisibleItemsCount(prev => prev + 8)
  }

  const getItemLocation = (itemId: string) => {
    const item = allItems.find(i => i.id === itemId)
    if (!item) return undefined

    const container = containers.find(c => c.id === item.containerId)
    if (!container) return 'Location not found'

    const place = places.find(p => p.id === container?.placeId)

    if (place) {
      return `${place.name} → ${container.name}`
    }

    return container.name
  }

  if (isLoading) {
    return <LoadingState message="Loading your inventory..." />
  }

  return (
    <div className="flex flex-col gap-10 pb-48 w-full max-w-full">
      {/* Top Section with Logo and Add Item */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          {/* Brand Logo */}
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
            Stowaway
          </h1>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              leftIcon={Plus}
              onClick={() => navigate('/places')}
              className="!px-6 !h-[44px] !py-0"
            >
              Add Item
            </Button>

            <button
              onClick={() => navigate('/profile')}
              className="w-[44px] h-[44px] rounded-full bg-bg-surface border border-border-standard flex items-center justify-center hover:border-accent-aqua hover:bg-accent-aqua/10 transition-all"
            >
              <User size={20} className="text-text-secondary" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-12">
        {/* Places Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                Places
              </h2>
              <button
                onClick={() => navigate('/places')}
                className="p-1 hover:bg-bg-page/50 rounded-full text-text-tertiary hover:text-accent-aqua transition-all"
              >
                <ChevronRight size={22} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative sort-dropdown">
              <button
                onClick={() => setShowPlacesSortMenu(!showPlacesSortMenu)}
                className="flex items-center gap-1.5 font-body text-[11px] font-bold text-text-tertiary tracking-wider uppercase hover:text-text-secondary transition-colors"
              >
                {getSortLabel(placesSortBy)}
                <ChevronDown size={12} className="text-text-tertiary" strokeWidth={3} />
              </button>
              {showPlacesSortMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-surface rounded-card shadow-card py-2 z-20 border border-border-standard backdrop-blur-md bg-opacity-95">
                  {(['recently-modified', 'recently-added', 'oldest-first', 'a-z', 'z-a'] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setPlacesSortBy(option)
                        setShowPlacesSortMenu(false)
                      }}
                      className={`w-full px-4 py-2 text-left font-body text-sm transition-colors ${placesSortBy === option
                        ? 'text-accent-aqua bg-accent-aqua/5 font-semibold'
                        : 'text-text-primary hover:bg-bg-page/50'
                        }`}
                    >
                      {getSortLabel(option)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {places.length === 0 ? (
            <EmptyState
              message="No places yet"
              actionLabel="Create your first place"
              onAction={() => navigate('/places')}
            />
          ) : (
            <div
              className="overflow-x-auto pb-4 no-scrollbar"
              style={{
                marginLeft: 'calc(-1 * max(1.5rem, var(--safe-area-inset-left, 0px)))',
                marginRight: 'calc(-1 * max(1.5rem, var(--safe-area-inset-right, 0px)))',
                paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))'
              }}
            >
              <div className="flex flex-col gap-3 min-w-max">
                {(() => {
                  const sortedPlaces = sortItems([...places], placesSortBy)
                  const row1 = sortedPlaces.filter((_, i) => i % 2 === 0)
                  const row2 = sortedPlaces.filter((_, i) => i % 2 !== 0)

                  return (
                    <>
                      {/* Row 1 */}
                      <div className="flex gap-4">
                        {row1.map((place) => {
                          const placeContainers = containers.filter((c) => c.placeId === place.id)
                          const totalItems = allItems.filter((item) =>
                            placeContainers.some((c) => c.id === item.containerId)
                          ).length
                          const placeColor = place.color || '#14B8A6'

                          return (
                            <Card
                              key={place.id}
                              variant="interactive"
                              onClick={() => navigate(`/places/${place.id}`)}
                              padding="none"
                              className="min-w-[140px] max-w-[400px] w-auto h-[68px] flex-shrink-0 overflow-hidden"
                            >
                              <div className="flex h-full items-stretch">
                                <div className="flex items-center justify-center flex-shrink-0 px-3">
                                  <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} size="sm" />
                                </div>
                                <div
                                  className="flex flex-col justify-center gap-1 min-w-0"
                                  style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
                                >
                                  <h3 className="font-display text-[16px] font-semibold text-text-primary truncate whitespace-nowrap leading-snug">
                                    {place.name}
                                  </h3>
                                  <p className="font-body text-[13px] text-text-secondary truncate whitespace-nowrap">
                                    {placeContainers.length} {placeContainers.length === 1 ? 'container' : 'containers'} · {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>

                      {/* Row 2 */}
                      <div className="flex gap-4">
                        {row2.map((place) => {
                          const placeContainers = containers.filter((c) => c.placeId === place.id)
                          const totalItems = allItems.filter((item) =>
                            placeContainers.some((c) => c.id === item.containerId)
                          ).length
                          const placeColor = place.color || '#14B8A6'

                          return (
                            <Card
                              key={place.id}
                              variant="interactive"
                              onClick={() => navigate(`/places/${place.id}`)}
                              padding="none"
                              className="min-w-[140px] max-w-[400px] w-auto h-[68px] flex-shrink-0 overflow-hidden"
                            >
                              <div className="flex h-full items-stretch">
                                <div className="flex items-center justify-center flex-shrink-0 px-3">
                                  <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} size="sm" />
                                </div>
                                <div
                                  className="flex flex-col justify-center gap-1 min-w-0"
                                  style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
                                >
                                  <h3 className="font-display text-[16px] font-semibold text-text-primary truncate whitespace-nowrap leading-snug">
                                    {place.name}
                                  </h3>
                                  <p className="font-body text-[13px] text-text-secondary truncate whitespace-nowrap">
                                    {placeContainers.length} {placeContainers.length === 1 ? 'container' : 'containers'} · {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Containers Section */}
        {containers.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                  Containers
                </h2>
                <button
                  onClick={() => navigate('/containers')}
                  className="p-1 hover:bg-bg-page/50 rounded-full text-text-tertiary hover:text-accent-aqua transition-all"
                >
                  <ChevronRight size={22} strokeWidth={2.5} />
                </button>
              </div>

              <div className="relative sort-dropdown">
                <button
                  onClick={() => setShowContainersSortMenu(!showContainersSortMenu)}
                  className="flex items-center gap-1.5 font-body text-[11px] font-bold text-text-tertiary tracking-wider uppercase hover:text-text-secondary transition-colors"
                >
                  {getSortLabel(containersSortBy)}
                  <ChevronDown size={12} className="text-text-tertiary" strokeWidth={3} />
                </button>
                {showContainersSortMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg-surface rounded-card shadow-card py-2 z-10 border border-border-standard backdrop-blur-md bg-opacity-95">
                    {(['recently-modified', 'recently-added', 'oldest-first', 'a-z', 'z-a'] as SortOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setContainersSortBy(option)
                          setShowContainersSortMenu(false)
                        }}
                        className={`w-full px-4 py-2 text-left font-body text-sm transition-colors ${containersSortBy === option
                          ? 'text-accent-aqua bg-accent-aqua/5 font-semibold'
                          : 'text-text-primary hover:bg-bg-page/50'
                          }`}
                      >
                        {getSortLabel(option)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className="overflow-x-auto pb-4 no-scrollbar"
              style={{
                marginLeft: 'calc(-1 * max(1.5rem, var(--safe-area-inset-left, 0px)))',
                marginRight: 'calc(-1 * max(1.5rem, var(--safe-area-inset-right, 0px)))',
                paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))'
              }}
            >
              <div className="flex gap-4 min-w-max">
                {sortItems([...containers], containersSortBy)
                  .slice(0, 8)
                  .map((container) => {
                    const place = places.find(p => p.id === container.placeId)
                    const containerItems = allItems.filter(item => item.containerId === container.id)
                    const containerColor = container.color || '#3B82F6'

                    return (
                      <Card
                        key={container.id}
                        variant="interactive"
                        onClick={() => navigate(`/containers/${container.id}`)}
                        padding="none"
                        className="w-[280px] flex-shrink-0 overflow-hidden"
                      >
                        <div className="flex items-stretch h-full">
                          {/* Icon Badge */}
                          <div className="flex items-center justify-center flex-shrink-0 px-3">
                            <IconOrEmoji iconValue={container.icon} defaultIcon={getContainerIcon()} color={containerColor} size="md" />
                          </div>

                          {/* Content */}
                          <div className="flex flex-col justify-center gap-1 min-w-0 p-4">
                            <h3 className="font-display text-[16px] font-semibold text-text-primary leading-snug">
                              {container.name}
                            </h3>
                            <p className="font-body text-[13px] text-text-secondary truncate">
                              {place?.name} · {containerItems.length} items
                            </p>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
              </div>
            </div>
          </div>
        )
        }

        {/* Items Section */}
        {
          recentItems.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                    Items
                  </h2>
                  <button
                    onClick={() => navigate('/items')}
                    className="p-1 hover:bg-bg-page/50 rounded-full text-text-tertiary hover:text-accent-aqua transition-all"
                  >
                    <ChevronRight size={22} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="relative sort-dropdown">
                  <button
                    onClick={() => setShowItemsSortMenu(!showItemsSortMenu)}
                    className="flex items-center gap-1.5 font-body text-[11px] font-bold text-text-tertiary tracking-wider uppercase hover:text-text-secondary transition-colors"
                  >
                    {getSortLabel(itemsSortBy)}
                    <ChevronDown size={12} className="text-text-tertiary" strokeWidth={3} />
                  </button>
                  {showItemsSortMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-bg-surface rounded-card shadow-card py-2 z-20 border border-border-standard backdrop-blur-md bg-opacity-95">
                      {(['recently-added', 'oldest-first', 'a-z', 'z-a'] as SortOption[]).map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setItemsSortBy(option)
                            setShowItemsSortMenu(false)
                          }}
                          className={`w-full px-4 py-2 text-left font-body text-sm transition-colors ${itemsSortBy === option
                            ? 'text-accent-aqua bg-accent-aqua/5 font-semibold'
                            : 'text-text-primary hover:bg-bg-page/50'
                            }`}
                        >
                          {getSortLabel(option)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Horizontal Scroll Container */}
              <div
                className="overflow-x-auto pb-8 no-scrollbar"
                style={{
                  marginLeft: 'calc(-1 * max(1.5rem, var(--safe-area-inset-left, 0px)))',
                  marginRight: 'calc(-1 * max(1.5rem, var(--safe-area-inset-right, 0px)))',
                  paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                  paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))'
                }}
              >
                <div className="flex gap-4 min-w-max">
                  {recentItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      location={getItemLocation(item.id)}
                      onClick={() => navigate(`/items/${item.id}`)}
                      className="w-[280px] flex-shrink-0"
                    />
                  ))}

                  {/* Show More Button */}
                  {hasMoreItems && (
                    <button
                      onClick={loadMoreItems}
                      className="w-[280px] flex-shrink-0 bg-bg-surface border border-border-standard rounded-card flex flex-col items-center justify-center gap-3 hover:border-accent-aqua hover:bg-accent-aqua/5 transition-all cursor-pointer min-h-[200px]"
                    >
                      <div className="w-12 h-12 rounded-full bg-accent-aqua/10 flex items-center justify-center text-accent-aqua">
                        <Plus size={24} strokeWidth={2.5} />
                      </div>
                      <div className="text-center">
                        <p className="font-display text-[15px] font-bold text-text-primary">
                          Show More
                        </p>
                        <p className="font-body text-[13px] text-text-tertiary">
                          {allRecentItems.length - visibleItemsCount} more items
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  )
}
