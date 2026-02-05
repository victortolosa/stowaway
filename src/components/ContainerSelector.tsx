import { useState } from 'react'
import { Modal, Button, Card, IconBadge, EmptyState } from './ui'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { CreateContainerModal } from './CreateContainerModal'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Package, Plus } from 'lucide-react'

export function ContainerSelector({
  isOpen,
  onClose,
  onBack,
  onContainerSelect,
  placeId,
  placeName
}: {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  onContainerSelect: (containerId: string) => void
  placeId: string
  placeName: string
}) {
  const queryClient = useQueryClient()
  const { data: allContainers = [], isLoading } = useAllContainers()
  const { data: items = [] } = useAllItems()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateContainerOpen, setIsCreateContainerOpen] = useState(false)

  const containers = allContainers.filter(c => c.placeId === placeId)

  const filteredContainers = containers.filter((container) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return container.name.toLowerCase().includes(query)
  })

  const getContainerColor = (index: number) => {
    const colors = ['#3B82F6', '#14B8A6', '#F59E0B', '#8B5CF6']
    return colors[index % colors.length]
  }

  const handleContainerCreated = async (containerId?: string) => {
    setIsCreateContainerOpen(false)
    await queryClient.invalidateQueries({ queryKey: ['containers'] })
    // Auto-select the newly created container
    if (containerId) {
      setTimeout(() => {
        onContainerSelect(containerId)
      }, 100)
    }
  }

  return (
    <>
      <Modal
        isOpen={isOpen && !isCreateContainerOpen}
        onClose={onClose}
        title="Create Item - Select Container"
      >
        <div className="flex flex-col gap-4">
          {/* Breadcrumb */}
          <div className="px-4 py-2 bg-bg-subtle rounded-lg">
            <p className="text-sm text-text-secondary">
              Place: <span className="font-semibold text-text-primary">{placeName}</span>
            </p>
          </div>

          {/* Create New Container Button */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Plus}
            onClick={() => setIsCreateContainerOpen(true)}
            fullWidth
          >
            Create New Container in {placeName}
          </Button>

          {/* Search */}
          <div className="bg-white rounded-xl h-[48px] px-4 flex items-center gap-3 border border-border-standard">
            <Search size={20} className="text-text-tertiary" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search containers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 font-body text-[15px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
              autoFocus
            />
          </div>

          {/* Containers List */}
          {isLoading ? (
            <div className="text-center py-8 text-text-tertiary">Loading containers...</div>
          ) : filteredContainers.length === 0 ? (
            containers.length === 0 ? (
              <div className="text-center py-8">
                <EmptyState message="No containers in this place yet" />
                <Button
                  variant="secondary"
                  onClick={onBack}
                  className="mt-4"
                >
                  Choose Different Place
                </Button>
              </div>
            ) : (
              <EmptyState message="No containers found" />
            )
          ) : (
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {filteredContainers.map((container, index) => {
                const itemCount = items.filter(i => i.containerId === container.id).length

                return (
                  <Card
                    key={container.id}
                    variant="interactive"
                    onClick={() => onContainerSelect(container.id)}
                    className="flex items-center gap-4"
                  >
                    <IconBadge icon={Package} color={getContainerColor(index)} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body text-[15px] font-semibold text-text-primary">
                        {container.name}
                      </h3>
                      <p className="font-body text-[13px] text-text-secondary">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onBack} fullWidth>
              Back
            </Button>
            <Button variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <CreateContainerModal
        isOpen={isCreateContainerOpen}
        onClose={() => setIsCreateContainerOpen(false)}
        onContainerCreated={handleContainerCreated}
        placeId={placeId}
      />
    </>
  )
}
