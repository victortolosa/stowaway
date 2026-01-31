import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventory } from '@/hooks'
import { useInventoryStore } from '@/store/inventory'
import { Search, ScanLine, Plus, Bell, ChevronRight, Home, Briefcase, Archive, MapPin, Package, Mic } from 'lucide-react'

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
    // Using hex codes related to our tokens or just generic distinct colors for badges
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
    <div className="p-4 flex flex-col gap-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] font-bold text-text-primary leading-tight">
            My Storage
          </h1>
          <p className="font-body text-[14px] text-text-secondary">
            {places.length} places · {containers.length} containers
          </p>
        </div>
        <button className="w-11 h-11 bg-bg-surface rounded-full flex items-center justify-center">
          <Bell size={20} className="text-text-primary" strokeWidth={2} />
        </button>
      </div>

      {/* Search Bar */}
      <div
        className="bg-bg-surface rounded-[26px] h-[52px] px-5 flex items-center gap-[14px] cursor-pointer"
        onClick={() => navigate('/search')}
      >
        <Search size={20} className="text-text-tertiary" strokeWidth={2} />
        <span className="font-body text-[15px] text-text-tertiary">
          Search items, containers...
        </span>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button className="flex-1 bg-accent-pink rounded-button h-14 flex items-center justify-center gap-[10px] active:opacity-90 transition">
          <ScanLine size={20} className="text-white" strokeWidth={2} />
          <span className="font-body text-[14px] font-semibold text-white">Scan QR</span>
        </button>
        <button
          onClick={() => navigate('/places')} // Maybe open a "Create Item" modal directly? For now navigate to places seems safe or maybe standard 'Add Item' flow.
          className="flex-1 bg-bg-surface rounded-button h-14 flex items-center justify-center gap-[10px] active:bg-bg-elevated transition"
        >
          <Plus size={20} className="text-text-primary" strokeWidth={2} />
          <span className="font-body text-[14px] font-semibold text-text-primary">Add Item</span>
        </button>
      </div>

      {/* Places Section */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-display text-[20px] font-bold text-text-primary">My Places</h2>
          <button
            onClick={() => navigate('/places')}
            className="font-body text-[14px] font-medium text-accent-pink"
          >
            See all
          </button>
        </div>

        {places.length === 0 ? (
          <div className="bg-bg-surface rounded-card p-6 text-center">
            <p className="font-body text-text-secondary mb-3">No places yet</p>
            <button
              onClick={() => navigate('/places')}
              className="font-body text-[14px] font-semibold text-accent-pink"
            >
              Create your first place
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {places.slice(0, 3).map((place, index) => {
              const placeContainers = containers.filter((c) => c.placeId === place.id)
              const totalItems = items.filter((item) =>
                placeContainers.some((c) => c.id === item.containerId)
              ).length
              const PlaceIcon = getPlaceIcon(place.type)

              return (
                <div
                  key={place.id}
                  onClick={() => navigate(`/places/${place.id}`)}
                  className="bg-bg-surface rounded-card p-4 flex items-center gap-4 cursor-pointer active:opacity-90 transition"
                >
                  <div
                    className="w-[52px] h-[52px] rounded-[14px] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: getPlaceColor(index) }}
                  >
                    <PlaceIcon size={24} className="text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <h3 className="font-display text-[16px] font-semibold text-text-primary">
                      {place.name}
                    </h3>
                    <p className="font-body text-[13px] text-text-secondary">
                      {placeContainers.length} containers · {totalItems} items
                    </p>
                  </div>
                  <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recently Added */}
      {recentItems.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-[20px] font-bold text-text-primary">Recently Added</h2>
            <button className="font-body text-[14px] font-medium text-accent-pink">
              See all
            </button>
          </div>

          <div className="bg-bg-surface rounded-card overflow-hidden">
            {recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/items/${item.id}`)}
                className="py-[14px] px-4 flex items-center gap-[14px] cursor-pointer active:bg-bg-elevated transition"
              >
                {item.photos[0] ? (
                  <img
                    src={item.photos[0]}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
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
                      <Mic size={12} className="text-accent-pink flex-shrink-0" />
                    )}
                  </div>
                  <p className="font-body text-[13px] text-text-secondary truncate">
                    {getItemLocation(item.id)}
                  </p>
                </div>
                <span className="font-body text-[12px] text-text-tertiary whitespace-nowrap">
                  {(() => {
                    const date = (item.createdAt as any)?.toDate?.() || new Date(item.createdAt as any)
                    const now = new Date()
                    const diffMs = now.getTime() - date.getTime()
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                    if (diffHours < 1) return 'Just now'
                    if (diffHours < 24) return `${diffHours}h ago`
                    const diffDays = Math.floor(diffHours / 24)
                    return `${diffDays}d ago`
                  })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
