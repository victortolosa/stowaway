import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { useInventory } from '@/hooks'
import { useNavigate } from 'react-router-dom'
import { Search, Package, QrCode } from 'lucide-react'
import { PageHeader, Card, EmptyState, IconBadge, LoadingState } from '@/components/ui'
import { Timestamp } from 'firebase/firestore'

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Date | Timestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  return timestamp instanceof Date ? timestamp : new Date(timestamp)
}

export function ContainersList() {
  const user = useAuthStore((state) => state.user)
  const { containers, items, places, isLoading } = useInventory()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  if (!user) {
    return <div>Please log in</div>
  }

  if (isLoading) {
    return <LoadingState message="Loading containers..." />
  }

  const getContainerColor = (index: number) => {
    const colors = ['#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6', '#F97316']
    return colors[index % colors.length]
  }

  const getContainerItemCount = (containerId: string) => {
    return items.filter((item) => item.containerId === containerId).length
  }

  const filteredContainers = containers.filter((container) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    const place = places.find(p => p.id === container.placeId)
    return (
      container.name.toLowerCase().includes(query) ||
      place?.name.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex flex-col h-full pb-48">
      <PageHeader
        title="All Containers"
        actionLabel="Add Container"
        onAction={() => navigate('/places')}
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="bg-white rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-black/5 focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200">
          <Search size={22} className="text-accent-aqua" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search containers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 font-body text-[16px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
          />
        </div>
      </div>

      {filteredContainers.length === 0 ? (
        <EmptyState
          message={searchQuery ? 'No containers found' : 'No containers yet'}
          actionLabel={searchQuery ? undefined : 'Add your first container'}
          onAction={searchQuery ? undefined : () => navigate('/places')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredContainers.map((container, index) => {
            const place = places.find(p => p.id === container.placeId)
            const itemCount = getContainerItemCount(container.id)

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
    </div>
  )
}
