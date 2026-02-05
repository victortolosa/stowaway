import { useState } from 'react'
import { PlaceSelector } from './PlaceSelector'
import { ContainerSelector } from './ContainerSelector'
import { CreateItemModal } from './CreateItemModal'
import { usePlaces } from '@/hooks/queries/usePlaces'

type Step = 'select-place' | 'select-container' | 'enter-details'

export function MultiStepCreateItemModal({
  isOpen,
  onClose,
  onItemCreated
}: {
  isOpen: boolean
  onClose: () => void
  onItemCreated: () => void
}) {
  const [step, setStep] = useState<Step>('select-place')
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null)

  const { data: places = [] } = usePlaces()
  const selectedPlace = places.find(p => p.id === selectedPlaceId)

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId)
    setStep('select-container')
  }

  const handleContainerSelect = (containerId: string) => {
    setSelectedContainerId(containerId)
    setStep('enter-details')
  }

  const handleBackFromContainer = () => {
    setStep('select-place')
    setSelectedPlaceId(null)
  }

  const handleBackFromDetails = () => {
    setStep('select-container')
    setSelectedContainerId(null)
  }

  const handleClose = () => {
    setStep('select-place')
    setSelectedPlaceId(null)
    setSelectedContainerId(null)
    onClose()
  }

  const handleItemCreated = () => {
    handleClose()
    onItemCreated()
  }

  if (step === 'select-place') {
    return (
      <PlaceSelector
        isOpen={isOpen}
        onClose={handleClose}
        onPlaceSelect={handlePlaceSelect}
        title="Create Item - Select Place"
      />
    )
  }

  if (step === 'select-container' && selectedPlaceId) {
    return (
      <ContainerSelector
        isOpen={isOpen}
        onClose={handleClose}
        onBack={handleBackFromContainer}
        onContainerSelect={handleContainerSelect}
        placeId={selectedPlaceId}
        placeName={selectedPlace?.name || 'Unknown Place'}
      />
    )
  }

  if (step === 'enter-details' && selectedContainerId) {
    return (
      <CreateItemModal
        isOpen={isOpen}
        onClose={handleClose}
        onItemCreated={handleItemCreated}
        containerId={selectedContainerId}
        showBackButton={true}
        onBack={handleBackFromDetails}
      />
    )
  }

  return null
}
