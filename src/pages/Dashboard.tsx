import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventory } from '@/hooks'
import { useInventoryStore } from '@/store/inventory'
import { Search, ScanLine, Plus, Bell, ChevronRight, Home, Briefcase, Archive, MapPin, Package, Mic } from 'lucide-react'
import { Button, Card, IconBadge, EmptyState } from '@/components/ui'

export function Dashboard() {
  const { refresh } = useInventory()
  const { places, containers, items } = useInventoryStore()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('Dashboard: Refreshing inventory...')
    refresh()
  }, [refresh])

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

  const recentItems = [...items]
    .sort((a, b) => {
      const dateA = (a.createdAt as any)?.toDate?.() || new Date(a.createdAt as any)
      const dateB = (b.createdAt as any)?.toDate?.() || new Date(b.createdAt as any)
      return dateB.getTime() - dateA.getTime()
    })
    .slice(0, 3)

  const getItemLocation = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return ''
    const container = containers.find(c => c.id === item.containerId)
    const place = places.find(p => p.id === container?.placeId)
    return `${place?.name || ''} → ${container?.name || ''}`
  }

  return (
    <div className="flex flex-col gap-10 pb-32 w-full max-w-full">
      {/* Top Section with Background Gradient/Header */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-text-primary leading-tight tracking-tight">
              My Storage
            </h1>
            <p className="font-body text-[15px] md:text-base text-text-secondary">
              {places.length} places · {containers.length} containers
            </p>
          </div>
          <Button variant="icon" size="icon" className="w-12 h-12 bg-white rounded-full shadow-sm hover:shadow-md border border-gray-100 transition-all">
            <Bell size={22} className="text-text-primary" strokeWidth={2} />
          </Button>
        </div>

        {/* Search Bar */}
        <div
          className="bg-white rounded-xl h-[52px] px-4 flex items-center gap-3 cursor-pointer shadow-sm border border-black/5 hover:border-black/10 hover:shadow-md transition-all duration-200 w-full"
          onClick={() => navigate('/search')}
        >
          <Search size={22} className="text-accent-aqua" strokeWidth={2.5} />
          <span className="font-body text-[16px] text-text-tertiary">
            Search items...
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:flex md:justify-start gap-4">
          <Button variant="primary" size="lg" className="w-full md:w-auto shadow-xl shadow-accent-aqua/20" leftIcon={ScanLine}>
            Scan QR
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full md:w-auto"
            leftIcon={Plus}
            onClick={() => navigate('/places')}
          >
            Add Item
          </Button>
        </div>

        {/* Places Section */}
        <div className="flex flex-col gap-5">
          <div className="flex justify-between items-center px-1">
            <h2 className="font-display text-[22px] md:text-2xl font-bold text-text-primary tracking-tight">My Places</h2>
            <button
              onClick={() => navigate('/places')}
              className="font-body text-[14px] font-medium text-accent-aqua hover:text-accent-aqua-dark transition-colors"
            >
              See all
            </button>
          </div>

          {places.length === 0 ? (
            <EmptyState
              message="No places yet"
              actionLabel="Create your first place"
              onAction={() => navigate('/places')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {places.slice(0, 3).map((place, index) => {
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
                    className="flex items-center gap-4 h-full"
                  >
                    <IconBadge icon={PlaceIcon} color={getPlaceColor(index)} size="sm" />
                    <div className="flex-1 flex flex-col gap-1">
                      <h3 className="font-display text-[16px] font-semibold text-text-primary">
                        {place.name}
                      </h3>
                      <p className="font-body text-[13px] text-text-secondary">
                        {placeContainers.length} containers · {totalItems} items
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Recently Added */}
        {recentItems.length > 0 && (
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center px-1">
              <h2 className="font-display text-[22px] md:text-2xl font-bold text-text-primary tracking-tight">Recently Added</h2>
              <button className="font-body text-[14px] font-medium text-accent-aqua hover:text-accent-aqua-dark transition-colors">
                See all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentItems.map((item) => (
                <Card key={item.id} padding="none" variant="interactive" className="overflow-hidden">
                  <div
                    onClick={() => navigate(`/items/${item.id}`)}
                    className="py-[14px] px-4 flex items-center gap-[14px] cursor-pointer h-full"
                  >
                    {item.photos[0] ? (
                      <img
                        src={item.photos[0]}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-gray-100"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-bg-elevated rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package size={24} className="text-text-tertiary" strokeWidth={2} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-body text-[15px] font-semibold text-text-primary truncate">
                          {item.name}
                        </h3>
                        {item.voiceNoteUrl && (
                          <Mic size={12} className="text-accent-aqua flex-shrink-0" />
                        )}
                      </div>
                      <p className="font-body text-[13px] text-text-secondary truncate">
                        {getItemLocation(item.id)}
                      </p>
                    </div>
                    <span className="font-body text-[12px] text-text-tertiary whitespace-nowrap self-start mt-1">
                      {(() => {
                        const date = (item.createdAt as any)?.toDate?.() || new Date(item.createdAt as any)
                        const now = new Date()
                        const diffMs = now.getTime() - date.getTime()
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                        if (diffHours < 1) return 'Just now'
                        if (diffHours < 24) return `${diffHours}h`
                        const diffDays = Math.floor(diffHours / 24)
                        return `${diffDays}d`
                      })()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
