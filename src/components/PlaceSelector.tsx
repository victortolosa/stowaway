import { useState } from 'react'
import { Modal, Button, Card, IconOrEmoji, EmptyState } from './ui'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { CreatePlaceModal } from './CreatePlaceModal'
import { useQueryClient } from '@tanstack/react-query'
import { Search, Plus } from 'lucide-react'
import { getPlaceIcon } from '@/utils/colorUtils'

export function PlaceSelector({
  isOpen,
  onClose,
  onPlaceSelect,
  title = 'Select Place'
}: {
  isOpen: boolean
  onClose: () => void
  onPlaceSelect: (placeId: string) => void
  title?: string
}) {
  const queryClient = useQueryClient()
  const { data: places = [], isLoading } = usePlaces()
  const { data: containers = [] } = useAllContainers()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatePlaceOpen, setIsCreatePlaceOpen] = useState(false)

  // Color and icon now come from database

  const filteredPlaces = places.filter((place) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return place.name.toLowerCase().includes(query) || place.type.toLowerCase().includes(query)
  })

  const handlePlaceCreated = async (placeId?: string) => {
    if (!placeId) {
      setIsCreatePlaceOpen(false)
      return
    }
    setIsCreatePlaceOpen(false)
    await queryClient.invalidateQueries({ queryKey: ['places'] })
    // Auto-select the newly created place
    setTimeout(() => {
      onPlaceSelect(placeId)
    }, 100)
  }

  return (
    <>
      <Modal isOpen={isOpen && !isCreatePlaceOpen} onClose={onClose} title={title}>
        <div className="flex flex-col gap-4">
          {/* Create New Place Button */}
          <Button
            variant="secondary"
            size="sm"
            leftIcon={Plus}
            onClick={() => setIsCreatePlaceOpen(true)}
            fullWidth
          >
            Create New Place
          </Button>

          {/* Search */}
          <div className="bg-white rounded-xl h-[48px] px-4 flex items-center gap-3 border border-border-standard">
            <Search size={20} className="text-text-tertiary" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search places..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 font-body text-[15px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
              autoFocus
            />
          </div>

          {/* Places List */}
          {isLoading ? (
            <div className="text-center py-8 text-text-tertiary">Loading places...</div>
          ) : filteredPlaces.length === 0 ? (
            <EmptyState message="No places found" />
          ) : (
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {filteredPlaces.map((place) => {
                const containerCount = containers.filter(c => c.placeId === place.id).length
                const placeColor = place.color || '#14B8A6'

                return (
                  <Card
                    key={place.id}
                    variant="interactive"
                    onClick={() => onPlaceSelect(place.id)}
                    className="flex items-center gap-4"
                  >
                    <IconOrEmoji iconValue={place.icon} defaultIcon={getPlaceIcon()} color={placeColor} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-body text-[15px] font-semibold text-text-primary">
                        {place.name}
                      </h3>
                      <p className="font-body text-[13px] text-text-secondary capitalize">
                        {place.type} · {containerCount} {containerCount === 1 ? 'container' : 'containers'}
                      </p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
        </div>
      </Modal>

      <CreatePlaceModal
        isOpen={isCreatePlaceOpen}
        onClose={() => setIsCreatePlaceOpen(false)}
        onPlaceCreated={handlePlaceCreated}
      />
    </>
  )
}
