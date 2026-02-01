import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInventory } from '@/hooks'
import { ArrowLeft, Search as SearchIcon, Package } from 'lucide-react'
import { BottomTabBar } from '@/components'
import { Card } from '@/components/ui'

export function Search() {
  const navigate = useNavigate()
  const { items, containers, places } = useInventory()
  const [query, setQuery] = useState('')

  const searchResults = query.trim()
    ? items.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    )
    : []

  const getItemLocation = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return ''
    const container = containers.find((c) => c.id === item.containerId)
    const place = places.find((p) => p.id === container?.placeId)
    return `${place?.name || ''} • ${container?.name || ''}`
  }

  return (
    <div className="min-h-screen bg-bg-page pb-[106px]">
      <div className="max-w-mobile mx-auto p-4">
        {/* Search Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={24} className="text-text-primary" />
          </button>
          <div className="flex-1 bg-bg-surface rounded-input h-12 px-4 flex items-center gap-3">
            <SearchIcon size={20} className="text-text-tertiary" />
            <input
              type="text"
              placeholder="Search items..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              className="font-body text-[15px] text-text-primary bg-transparent border-none outline-none flex-1 placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* Results Info */}
        {query.trim() && (
          <p className="font-body text-sm text-text-secondary mb-5">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{query}"
          </p>
        )}

        {/* Results List */}
        <div className="space-y-3">
          {searchResults.map((item) => (
            <Card
              key={item.id}
              variant="interactive"
              padding="sm"
              onClick={() => navigate(`/items/${item.id}`)}
              className="flex items-center gap-[14px]"
            >
              {item.photos[0] ? (
                <img
                  src={item.photos[0]}
                  alt={item.name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-bg-elevated rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={24} className="text-text-tertiary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-body text-base font-semibold text-text-primary">
                  {item.name}
                </h3>
                <p className="font-body text-sm text-text-secondary truncate">
                  {getItemLocation(item.id)}
                </p>
              </div>
            </Card>
          ))}
        </div>

        {query.trim() && searchResults.length === 0 && (
          <div className="text-center py-12">
            <p className="font-body text-text-secondary">No items found</p>
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
