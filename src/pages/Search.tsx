import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventory } from '@/hooks'
import { ArrowLeft, Search as SearchIcon, Package, Home, Briefcase, Archive, MapPin, QrCode, Mic } from 'lucide-react'
import { BottomTabBar } from '@/components'
import { Card, IconBadge, Badge } from '@/components/ui'
import { Timestamp } from 'firebase/firestore'

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

export function Search() {
  const navigate = useNavigate()
  const { items, containers, places } = useInventory()
  const [query, setQuery] = useState('')

  const getItemLocation = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return ''
    const container = containers.find((c) => c.id === item.containerId)
    const place = places.find((p) => p.id === container?.placeId)
    return `${place?.name || ''} → ${container?.name || ''}`
  }

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'home': return Home
      case 'office': return Briefcase
      case 'storage': return Archive
      default: return MapPin
    }
  }

  const getPlaceColor = (index: number) => {
    const colors = ['#14B8A6', '#F59E0B', '#3B82F6', '#8B5CF6']
    return colors[index % colors.length]
  }

  const getContainerColor = (index: number) => {
    const colors = ['#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#F97316']
    return colors[index % colors.length]
  }

  const searchedItems = query.trim()
    ? items.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase())) ||
        getItemLocation(item.id).toLowerCase().includes(query.toLowerCase())
    )
    : []

  const searchedContainers = query.trim()
    ? containers.filter((container) => {
        const queryLower = query.toLowerCase()
        const place = places.find(p => p.id === container.placeId)
        return (
          container.name.toLowerCase().includes(queryLower) ||
          place?.name.toLowerCase().includes(queryLower)
        )
      })
    : []

  const searchedPlaces = query.trim()
    ? places.filter((place) => {
        const queryLower = query.toLowerCase()
        const placeContainers = containers.filter((c) => c.placeId === place.id)
        return (
          place.name.toLowerCase().includes(queryLower) ||
          place.type.toLowerCase().includes(queryLower) ||
          placeContainers.some(c => c.name.toLowerCase().includes(queryLower))
        )
      })
    : []

  const totalResults = searchedItems.length + searchedContainers.length + searchedPlaces.length

  return (
    <div className="min-h-screen bg-bg-page pb-[106px]">
      <div className="max-w-mobile mx-auto p-4">
        {/* Search Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/dashboard')} className="p-2">
            <ArrowLeft size={24} className="text-text-primary" />
          </button>
          <div className="flex-1 bg-white rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
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

        {/* Results Info */}
        {query.trim() && (
          <p className="font-body text-sm text-text-secondary mb-5">
            {totalResults} result{totalResults !== 1 ? 's' : ''} for "{query}"
          </p>
        )}

        {/* Results List */}
        <div className="space-y-6">
          {/* Items Section */}
          {searchedItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-[18px] font-bold text-text-primary">Items ({searchedItems.length})</h2>
              {searchedItems.map((item) => (
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
                        <Package size={28} className="text-text-tertiary" strokeWidth={2} />
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
                          {item.tags.slice(0, 2).map((tag) => (
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
          {searchedContainers.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-[18px] font-bold text-text-primary">Containers ({searchedContainers.length})</h2>
              {searchedContainers.map((container, index) => {
                const place = places.find(p => p.id === container.placeId)
                const itemCount = items.filter(item => item.containerId === container.id).length

                return (
                  <Card
                    key={container.id}
                    variant="interactive"
                    onClick={() => navigate(`/containers/${container.id}`)}
                    className="flex items-center gap-[14px]"
                  >
                    <IconBadge icon={Package} color={getContainerColor(index)} />
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
          {searchedPlaces.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display text-[18px] font-bold text-text-primary">Places ({searchedPlaces.length})</h2>
              {searchedPlaces.map((place, index) => {
                const placeContainers = containers.filter((c) => c.placeId === place.id)
                const PlaceIcon = getPlaceIcon(place.type)

                return (
                  <Card
                    key={place.id}
                    variant="interactive"
                    onClick={() => navigate(`/places/${place.id}`)}
                    className="flex items-center gap-[14px]"
                  >
                    <IconBadge icon={PlaceIcon} color={getPlaceColor(index)} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body text-[16px] font-semibold text-text-primary">
                        {place.name}
                      </h3>
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

      <BottomTabBar />
    </div>
  )
}
