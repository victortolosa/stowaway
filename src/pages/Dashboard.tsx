import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventory } from '@/hooks'
import { Plus, Home, Briefcase, Archive, MapPin, Package, ChevronRight, ChevronDown, User } from 'lucide-react'
import { Button, Card, EmptyState, LoadingState } from '@/components/ui'
import { ItemCard } from '@/components/ItemCard'
import { Timestamp } from 'firebase/firestore'

type SortOption = 'recently-added' | 'oldest-first' | 'a-z' | 'z-a' | 'recently-modified'

// Helper to convert Firestore Timestamp to Date (Internal to Dashboard for sorting)
const toDateSync = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

export function Dashboard() {
  const { places, containers, items, isLoading, refresh } = useInventory()
  const navigate = useNavigate()
  const [visibleItemsCount, setVisibleItemsCount] = useState(8)

  const [itemsSortBy, setItemsSortBy] = useState<SortOption>('recently-added')
  const [containersSortBy, setContainersSortBy] = useState<SortOption>('recently-modified')
  const [placesSortBy, setPlacesSortBy] = useState<SortOption>('recently-modified')

  const [showItemsSortMenu, setShowItemsSortMenu] = useState(false)
  const [showContainersSortMenu, setShowContainersSortMenu] = useState(false)
  const [showPlacesSortMenu, setShowPlacesSortMenu] = useState(false)

  useEffect(() => {
    console.log('Dashboard: Refreshing inventory...')
    refresh()
  }, [refresh])

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

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'home': return Home
      case 'office': return Briefcase
      case 'storage': return Archive
      default: return MapPin
    }
  }

  const getPlaceColor = (index: number) => {
    const colors = ['#F59E0B', '#14B8A6', '#FFC0CB', '#F97316', '#3B82F6']
    return colors[index % colors.length]
  }

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

  const allRecentItems = sortItems([...items], itemsSortBy)
  const recentItems = allRecentItems.slice(0, visibleItemsCount)
  const hasMoreItems = allRecentItems.length > visibleItemsCount

  const loadMoreItems = () => {
    setVisibleItemsCount(prev => prev + 8)
  }

  const getItemLocation = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return ''
    const container = containers.find(c => c.id === item.containerId)
    const place = places.find(p => p.id === container?.placeId)
    return `${place?.name || ''} → ${container?.name || ''}`
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

      <div className="flex flex-col gap-10">
        {/* Items Section */}
        {recentItems.length > 0 && (
          <div className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between">
              <button
                onClick={() => navigate('/items')}
                className="flex items-center gap-2 group"
              >
                <h2 className="font-display text-[22px] md:text-2xl font-bold text-text-primary tracking-tight">Items</h2>
                <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
              </button>
              <div className="relative sort-dropdown">
                <button
                  onClick={() => setShowItemsSortMenu(!showItemsSortMenu)}
                  className="flex items-center gap-1.5 font-body text-[12px] font-medium text-text-tertiary tracking-wide uppercase hover:text-text-secondary transition-colors"
                >
                  {getSortLabel(itemsSortBy)}
                  <ChevronDown size={14} className="text-text-tertiary" strokeWidth={2} />
                </button>
                {showItemsSortMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg-page rounded-card shadow-card py-2 z-10 border border-border-standard">
                    {(['recently-added', 'oldest-first', 'a-z', 'z-a'] as SortOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setItemsSortBy(option)
                          setShowItemsSortMenu(false)
                        }}
                        className={`w-full px-4 py-2 text-left font-body text-sm transition-colors ${itemsSortBy === option
                          ? 'text-accent-aqua bg-accent-aqua/10'
                          : 'text-text-primary hover:bg-bg-surface'
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
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
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
                      className="w-[280px] flex-shrink-0 bg-bg-surface border-2 border-dashed border-border-standard rounded-card flex flex-col items-center justify-center gap-3 hover:border-accent-aqua hover:bg-accent-aqua/5 transition-all cursor-pointer min-h-[220px]"
                    >
                      <Plus size={32} className="text-accent-aqua" strokeWidth={2} />
                      <div className="text-center">
                        <p className="font-display text-[15px] font-semibold text-text-primary">
                          Show More
                        </p>
                        <p className="font-body text-[13px] text-text-secondary">
                          {allRecentItems.length - visibleItemsCount} more items
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Containers Section */}
        {containers.length > 0 && (
          <div className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between">
              <button
                onClick={() => navigate('/containers')}
                className="flex items-center gap-2 group"
              >
                <h2 className="font-display text-[22px] md:text-2xl font-bold text-text-primary tracking-tight">Containers</h2>
                <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
              </button>
              <div className="relative sort-dropdown">
                <button
                  onClick={() => setShowContainersSortMenu(!showContainersSortMenu)}
                  className="flex items-center gap-1.5 font-body text-[12px] font-medium text-text-tertiary tracking-wide uppercase hover:text-text-secondary transition-colors"
                >
                  {getSortLabel(containersSortBy)}
                  <ChevronDown size={14} className="text-text-tertiary" strokeWidth={2} />
                </button>
                {showContainersSortMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg-page rounded-card shadow-card py-2 z-10 border border-border-standard">
                    {(['recently-modified', 'recently-added', 'oldest-first', 'a-z', 'z-a'] as SortOption[]).map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          setContainersSortBy(option)
                          setShowContainersSortMenu(false)
                        }}
                        className={`w-full px-4 py-2 text-left font-body text-sm transition-colors ${containersSortBy === option
                          ? 'text-accent-aqua bg-accent-aqua/10'
                          : 'text-text-primary hover:bg-bg-surface'
                          }`}
                      >
                        {getSortLabel(option)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
              <div className="flex gap-4 min-w-max">
                {sortItems([...containers], containersSortBy)
                  .slice(0, 8)
                  .map((container, index) => {
                    const place = places.find(p => p.id === container.placeId)
                    const containerItems = items.filter(item => item.containerId === container.id)
                    const containerColor = getPlaceColor(index)

                    return (
                      <Card
                        key={container.id}
                        variant="interactive"
                        onClick={() => navigate(`/containers/${container.id}`)}
                        padding="none"
                        className="w-[280px] flex-shrink-0"
                      >
                        <div className="flex items-center gap-4 p-5 h-full">
                          {/* Icon Badge */}
                          <div
                            className="w-[84px] h-[84px] rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: containerColor + '15' }}
                          >
                            <Package size={42} style={{ color: containerColor }} strokeWidth={2} />
                          </div>

                          {/* Content */}
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
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
        )}

        {/* Places Section */}
        <div className="flex flex-col gap-5">
          <div className="flex items-baseline justify-between">
            <button
              onClick={() => navigate('/places')}
              className="flex items-center gap-2 group"
            >
              <h2 className="font-display text-[22px] md:text-2xl font-bold text-text-primary tracking-tight">Places</h2>
              <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
            </button>
            <div className="relative sort-dropdown">
              <button
                onClick={() => setShowPlacesSortMenu(!showPlacesSortMenu)}
                className="flex items-center gap-1.5 font-body text-[12px] font-medium text-text-tertiary tracking-wide uppercase hover:text-text-secondary transition-colors"
              >
                {getSortLabel(placesSortBy)}
                <ChevronDown size={14} className="text-text-tertiary" strokeWidth={2} />
              </button>
              {showPlacesSortMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-page rounded-card shadow-card py-2 z-10 border border-border-standard">
                  {(['recently-modified', 'recently-added', 'oldest-first', 'a-z', 'z-a'] as SortOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setPlacesSortBy(option)
                        setShowPlacesSortMenu(false)
                      }}
                      className={`w-full px-4 py-2 text-left font-body text-sm transition-colors ${placesSortBy === option
                        ? 'text-accent-aqua bg-accent-aqua/10'
                        : 'text-text-primary hover:bg-bg-surface'
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
            <div className="overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
              <div className="flex gap-4 min-w-max">
                {sortItems([...places], placesSortBy).map((place, index) => {
                  const placeContainers = containers.filter((c) => c.placeId === place.id)
                  const totalItems = items.filter((item) =>
                    placeContainers.some((c) => c.id === item.containerId)
                  ).length
                  const PlaceIcon = getPlaceIcon(place.type)

                  return (
                    <Card
                      key={place.id}
                      variant="interactive"
                      onClick={() => navigate(`/places/${place.id}`)}
                      padding="none"
                      className="w-[350px] flex-shrink-0"
                    >
                      <div className="flex items-center gap-3 p-5">
                        {/* Icon Badge */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: getPlaceColor(index) + '15' }}
                        >
                          <PlaceIcon size={18} style={{ color: getPlaceColor(index) }} strokeWidth={2} />
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <h3 className="font-display text-[16px] font-semibold text-text-primary truncate">
                            {place.name}
                          </h3>
                          <p className="font-body text-[13px] text-text-secondary truncate">
                            {placeContainers.length} containers · {totalItems} items
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
