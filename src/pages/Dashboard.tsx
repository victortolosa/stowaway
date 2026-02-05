import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
// We use useAllItems for client-side filtering/sorting and counts
import { useAllItems } from '@/hooks/queries/useAllItems'
import { Plus, ChevronRight, User, MapPin, Box, Package } from 'lucide-react'
import { LoadingState, Card, EmptyState, IconOrEmoji, CreatePlaceModal, MultiStepCreateContainerModal, MultiStepCreateItemModal } from '@/components'
import { ItemCard } from '@/components/ItemCard'
import { useOnClickOutside } from '@/hooks/useOnClickOutside'

import { getPlaceIcon, getContainerIcon } from '@/utils/colorUtils'
import { sortItems } from '@/utils/sortUtils'

export function Dashboard() {
  const navigate = useNavigate()

  const { data: places = [], isLoading: isPlacesLoading } = usePlaces()
  const { data: containers = [], isLoading: isContainersLoading } = useAllContainers()
  const { data: allItems = [], isLoading: isAllItemsLoading } = useAllItems()

  const isLoading = isPlacesLoading || isContainersLoading || isAllItemsLoading

  const [visibleItemsCount, setVisibleItemsCount] = useState(8)

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
  const sortedContainers = sortItems([...containers], 'recently-modified').slice(0, 16)
  const allRecentItems = sortItems([...itemsToDisplay], 'recently-added')
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
    <>
      <div className="flex flex-col gap-10 pb-48 w-full max-w-full">
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
                      <MapPin size={18} className="text-accent-aqua" />
                      <span className="font-body text-[15px] text-text-primary">Add Place</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false)
                        setShowCreateContainerModal(true)
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-page transition-colors text-left border-t border-border-standard"
                    >
                      <Box size={18} className="text-accent-aqua" />
                      <span className="font-body text-[15px] text-text-primary">Add Container</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAddMenu(false)
                        setShowCreateItemModal(true)
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-bg-page transition-colors text-left border-t border-border-standard"
                    >
                      <Package size={18} className="text-accent-aqua" />
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

        <div className="flex flex-col gap-12">
          {/* Places Section */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                  Places
                </h2>
                <button
                  onClick={() => navigate('/places')}
                  className="p-1 hover:bg-bg-page/50 rounded-full text-text-quaternary hover:text-accent-aqua transition-all"
                >
                  <ChevronRight size={22} strokeWidth={2.5} />
                </button>
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
                <div className="flex items-center gap-1.5">
                  <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                    Containers
                  </h2>
                  <button
                    onClick={() => navigate('/containers')}
                    className="p-1 hover:bg-bg-page/50 rounded-full text-text-quaternary hover:text-accent-aqua transition-all"
                  >
                    <ChevronRight size={22} strokeWidth={2.5} />
                  </button>
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
                <div className="flex flex-col gap-3 min-w-max">
                  {(() => {
                    const row1 = sortedContainers.filter((_, i) => i % 2 === 0)
                    const row2 = sortedContainers.filter((_, i) => i % 2 !== 0)

                    const renderRow = (rowItems: typeof sortedContainers) => (
                      <div className="flex gap-4">
                        {rowItems.map((container) => {
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
                                  style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
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
                        })}
                      </div>
                    )

                    return (
                      <>
                        {renderRow(row1)}
                        {row2.length > 0 && renderRow(row2)}
                      </>
                    )
                  })()}
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
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-display text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                      Items
                    </h2>
                    <button
                      onClick={() => navigate('/items')}
                      className="p-1 hover:bg-bg-page/50 rounded-full text-text-quaternary hover:text-accent-aqua transition-all"
                    >
                      <ChevronRight size={22} strokeWidth={2.5} />
                    </button>
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
