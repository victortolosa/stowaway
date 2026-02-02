import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'
import { useNavigate } from 'react-router-dom'
import { Search, Package, Mic } from 'lucide-react'
import { PageHeader, Card, EmptyState } from '@/components/ui'
import { Timestamp } from 'firebase/firestore'

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

export function ItemsList() {
  const user = useAuthStore((state) => state.user)
  const { items, containers, places } = useInventory()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  if (!user) {
    return <div>Please log in</div>
  }

  const getItemLocation = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return ''
    const container = containers.find(c => c.id === item.containerId)
    const place = places.find(p => p.id === container?.placeId)
    return `${place?.name || ''} → ${container?.name || ''}`
  }

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const location = getItemLocation(item.id).toLowerCase()
    return (
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query)) ||
      location.includes(query)
    )
  })

  return (
    <div className="flex flex-col h-full pb-48">
      <PageHeader
        title="All Items"
        actionLabel="Add Item"
        onAction={() => navigate('/places')}
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="bg-white rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
          <Search size={22} className="text-accent-aqua" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 font-body text-[16px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          message={searchQuery ? 'No items found' : 'No items yet'}
          actionLabel={searchQuery ? undefined : 'Add your first item'}
          onAction={searchQuery ? undefined : () => navigate('/places')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => (
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
                  <span className="font-body text-[12px] text-text-tertiary">
                    {(() => {
                      const date = toDate(item.createdAt)
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
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
