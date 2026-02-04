import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PageHeader, EmptyState, LoadingState } from '@/components/ui'
import { ItemCard } from '@/components/ItemCard'




export function ItemsList() {
  const user = useAuthStore((state) => state.user)
  const { data: items = [], isLoading: isItemsLoading } = useAllItems()
  const { data: containers = [] } = useAllContainers()
  const { data: places = [] } = usePlaces()

  const isLoading = isItemsLoading
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  if (!user) {
    return <div>Please log in</div>
  }

  if (isLoading) {
    return <LoadingState message="Loading items..." />
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              location={getItemLocation(item.id)}
              onClick={() => navigate(`/items/${item.id}`)}
              showDate={true}
            />
          ))}
        </div>
      )}
    </div>
  )
}
