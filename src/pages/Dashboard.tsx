import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
// We use useAllItems for client-side filtering/sorting and counts
import { useAllItems } from '@/hooks/queries/useAllItems'
import { Plus, ChevronRight, User, Users, MapPin, Box, Package } from 'lucide-react'
import { LoadingState, Card, EmptyState, IconOrEmoji, CreatePlaceModal, MultiStepCreateContainerModal, MultiStepCreateItemModal, ParallaxRowList } from '@/components'
import { ItemCard } from '@/components/ItemCard'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'

import { getPlaceIcon, getContainerIcon, DEFAULT_PLACE_COLOR, DEFAULT_CONTAINER_COLOR, DEFAULT_ITEM_COLOR } from '@/utils/colorUtils'
import { sortItems } from '@/utils/sortUtils'
import { Button } from '@/components/ui'
import { isPlaceShared } from '@/utils/placeUtils'

export function Dashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
  const { data: containers = [], isLoading: isContainersLoading } = useAllContainers()
  const { data: allItems = [], isLoading: isAllItemsLoading } = useAllItems()

  const isLoading = isPlacesLoading || isContainersLoading || isAllItemsLoading


  const [placesFilter, setPlacesFilter] = useState<'all' | 'shared'>('all')

  // Add menu state
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showCreatePlaceModal, setShowCreatePlaceModal] = useState(false)
  const [showCreateContainerModal, setShowCreateContainerModal] = useState(false)
  const [showCreateItemModal, setShowCreateItemModal] = useState(false)

  const addMenuRef = useRef<HTMLDivElement>(null)
  useOnClickOutside(addMenuRef, useCallback(() => setShowAddMenu(false), []))


  // Dashboard usually doesn't need auto-refresh on mount if RQ staleTime is configured,
  // but let's keep it simple.

  // Dashboard defaults to recently modified for Places and Containers, recently added for Items
  const itemsToDisplay = allItems

  const sortedPlaces = sortItems([...places], 'recently-modified')
  const displayedPlaces = placesFilter === 'shared'
    ? sortedPlaces.filter((place) => isPlaceShared(place, user?.uid)).slice(0, 20)
    : sortedPlaces.slice(0, 20)
  const sortedContainers = sortItems([...containers], 'recently-modified').slice(0, 20)
  const allRecentItems = sortItems([...itemsToDisplay], 'recently-added')
  const recentItems = allRecentItems.slice(0, 16)
  const hasMoreItems = allRecentItems.length > 16

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
    <>
      <div className="flex flex-col gap-14 md:gap-16 pb-8 w-full max-w-full">
        {/* Top Section with Logo and Add Item */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            {/* Brand Logo */}
            <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
              Stowaway
            </h1>

            <div className="flex items-center gap-3">
              {/* Add Menu Button */}
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="w-[44px] h-[44px] rounded-full bg-accent-aqua text-white flex items-center justify-center hover:bg-accent-aqua/90 transition-all shadow-sm"
                >
                  <Plus size={20} strokeWidth={2.5} />
                </button>

                {/* Dropdown Menu */}
                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-bg-surface border border-border-standard rounded-xl shadow-lg overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setShowAddMenu(false)
                        setShowCreatePlaceModal(true)
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-page transition-colors text-left"
                    >
                      <MapPin size={18} style={{ color: DEFAULT_PLACE_COLOR }} />
                      <span className="font-body text-[15px] text-text-primary">Add Place</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false)
                        setShowCreateContainerModal(true)
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-page transition-colors text-left border-t border-border-standard"
                    >
                      <Package size={18} style={{ color: DEFAULT_CONTAINER_COLOR }} />
                      <span className="font-body text-[15px] text-text-primary">Add Container</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false)
                        setShowCreateItemModal(true)
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-page transition-colors text-left border-t border-border-standard"
                    >
                      <Box size={18} style={{ color: DEFAULT_ITEM_COLOR }} />
                      <span className="font-body text-[15px] text-text-primary">Add Item</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="w-[44px] h-[44px] rounded-full bg-bg-surface border border-border-standard flex items-center justify-center hover:border-accent-aqua hover:bg-accent-aqua/10 transition-all"
              >
                <User size={20} className="text-text-secondary" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* Places Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/places')}
                className="flex items-center gap-1.5 group"
              >
                <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight group-hover:text-accent-aqua transition-colors">
                  Places
                </h2>
                <div
                  className="p-1 rounded-full text-text-quaternary group-hover:text-accent-aqua transition-all"
                >
                  <ChevronRight size={22} strokeWidth={2.5} />
                </div>
              </button>
              {places.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={placesFilter === 'all' ? 'secondary' : 'ghost'}
                    onClick={() => setPlacesFilter('all')}
                    className="h-7 px-3 text-[11px]"
                    aria-pressed={placesFilter === 'all'}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={placesFilter === 'shared' ? 'secondary' : 'ghost'}
                    onClick={() => setPlacesFilter('shared')}
                    className="h-7 px-3 text-[11px]"
                    aria-pressed={placesFilter === 'shared'}
                  >
                    Shared
                  </Button>
                </div>
              )}
            </div>

            {places.length === 0 ? (
              <EmptyState
                message="No places yet"
                actionLabel="Create your first place"
                onAction={() => navigate('/places')}
              />
            ) : displayedPlaces.length === 0 ? (
              <EmptyState
                message="No shared places yet"
              />
            ) : (
              <ParallaxRowList
                items={displayedPlaces}
                numRows={displayedPlaces.length > 14 ? 3 : 2}
                onSeeAll={() => navigate('/places')}
                getItemWidth={(place) => {
                  // Icon (~40px) + Padding (~20px) + Text (approx 9px/char)
                  // Clamped between 140 and 400
                  const width = 60 + (place.name.length * 10)
                  return Math.min(Math.max(width, 140), 400)
                }}
                renderItem={(place) => {
                  const placeContainers = containers.filter((c) => c.placeId === place.id)
                  const totalItems = allItems.filter((item) =>
                    placeContainers.some((c) => c.id === item.containerId)
                  ).length
                  const placeColor = place.color || '#14B8A6'
                  const shared = isPlaceShared(place, user?.uid)

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
                          style={{ paddingLeft: '0.25rem', paddingRight: '1.25rem' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-display text-[16px] font-semibold text-text-primary truncate whitespace-nowrap leading-snug">
                              {place.name}
                            </h3>
                            {shared && (
                              <span
                                className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent-blue/20 text-accent-blue flex-shrink-0"
                                aria-label="Shared"
                              >
                                <Users size={12} strokeWidth={2.5} />
                              </span>
                            )}
                          </div>
                          <p className="font-body text-[13px] text-text-secondary truncate whitespace-nowrap">
                            {placeContainers.length} {placeContainers.length === 1 ? 'container' : 'containers'} · {totalItems} {totalItems === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                }}
              />
            )}
          </div>

          {/* Containers Section */}
          {containers.length > 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => navigate('/containers')}
                  className="flex items-center gap-1.5 group"
                >
                  <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight group-hover:text-accent-aqua transition-colors">
                    Containers
                  </h2>
                  <div
                    className="p-1 rounded-full text-text-quaternary group-hover:text-accent-aqua transition-all"
                  >
                    <ChevronRight size={22} strokeWidth={2.5} />
                  </div>
                </button>
              </div>

              <ParallaxRowList
                items={sortedContainers}
                numRows={sortedContainers.length > 14 ? 3 : 2}
                onSeeAll={() => navigate('/containers')}
                getItemWidth={(container) => {
                  const width = 60 + (container.name.length * 10)
                  return Math.min(Math.max(width, 140), 400)
                }}
                renderItem={(container) => {
                  const place = places.find(p => p.id === container.placeId)
                  const containerItems = allItems.filter(item => item.containerId === container.id)
                  const containerColor = container.color || '#3B82F6'

                  return (
                    <Card
                      key={container.id}
                      variant="interactive"
                      onClick={() => navigate(`/containers/${container.id}`)}
                      padding="none"
                      className="min-w-[140px] max-w-[400px] w-auto h-[68px] flex-shrink-0 overflow-hidden"
                    >
                      <div className="flex items-stretch h-full">
                        {/* Icon Badge */}
                        <div className="flex items-center justify-center flex-shrink-0 px-3">
                          <IconOrEmoji iconValue={container.icon} defaultIcon={getContainerIcon()} color={containerColor} size="sm" />
                        </div>

                        {/* Content */}
                        <div
                          className="flex flex-col justify-center gap-1 min-w-0"
                          style={{ paddingLeft: '0.25rem', paddingRight: '1.25rem' }}
                        >
                          <h3 className="font-display text-[15px] font-semibold text-text-primary leading-snug truncate whitespace-nowrap">
                            {container.name}
                          </h3>
                          <p className="font-body text-[12px] text-text-secondary truncate whitespace-nowrap">
                            {place?.name} · {containerItems.length} items
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                }}
              />
            </div>
          )
          }

          {/* Items Section */}
          {
            recentItems.length > 0 && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate('/items')}
                    className="flex items-center gap-1.5 group"
                  >
                    <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight group-hover:text-accent-aqua transition-colors">
                      Items
                    </h2>
                    <div
                      className="p-1 rounded-full text-text-quaternary group-hover:text-accent-aqua transition-all"
                    >
                      <ChevronRight size={22} strokeWidth={2.5} />
                    </div>
                  </button>
                </div>

                {/* Horizontal Scroll Container */}
                <ParallaxRowList
                  items={recentItems}
                  numRows={2}
                  onSeeAll={hasMoreItems ? () => navigate('/items') : undefined}
                  getItemWidth={(item) => {
                    // Image (100px) + Padding (32px) + Text
                    // Use max(name, location)
                    const location = getItemLocation(item.id) || ''
                    const textLen = Math.max(item.name.length, location.length * 0.7) // location is smaller text
                    const width = 132 + (textLen * 9)
                    return Math.min(Math.max(width, 280), 400)
                  }}
                  renderItem={(item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      location={getItemLocation(item.id)}
                      onClick={() => navigate(`/items/${item.id}`)}
                      className="min-w-[280px] max-w-[400px] flex-shrink-0"
                      autoWidth
                    />
                  )}
                />
              </div>
            )
          }
        </div >
      </div >

      {/* Creation Modals */}
      <CreatePlaceModal
        isOpen={showCreatePlaceModal}
        onClose={() => setShowCreatePlaceModal(false)}
        onPlaceCreated={() => setShowCreatePlaceModal(false)}
      />

      <MultiStepCreateContainerModal
        isOpen={showCreateContainerModal}
        onClose={() => setShowCreateContainerModal(false)}
        onContainerCreated={() => setShowCreateContainerModal(false)}
      />

      <MultiStepCreateItemModal
        isOpen={showCreateItemModal}
        onClose={() => setShowCreateItemModal(false)}
        onItemCreated={() => setShowCreateItemModal(false)}
      />
    </>
  )
}
