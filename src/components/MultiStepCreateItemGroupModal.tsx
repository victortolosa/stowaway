import { useState } from 'react'
import { PlaceSelector } from './PlaceSelector'
import { ContainerSelector } from './ContainerSelector'
import { CreateGroupModal } from './CreateGroupModal'
import { usePlaces } from '@/hooks/queries/usePlaces'

type Step = 'select-place' | 'select-container' | 'create-group'

export function MultiStepCreateItemGroupModal({
  isOpen,
  onClose,
  onGroupCreated
}: {
  isOpen: boolean
  onClose: () => void
  onGroupCreated: () => void
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
    setStep('create-group')
  }

  const handleBackFromContainer = () => {
    setStep('select-place')
    setSelectedPlaceId(null)
  }

  const handleBackFromGroup = () => {
    setStep('select-container')
    setSelectedContainerId(null)
  }

  const handleClose = () => {
    setStep('select-place')
    setSelectedPlaceId(null)
    setSelectedContainerId(null)
    onClose()
  }

  const handleGroupCreated = () => {
    handleClose()
    onGroupCreated()
  }

  if (step === 'select-place') {
    return (
      <PlaceSelector
        isOpen={isOpen}
        onClose={handleClose}
        onPlaceSelect={handlePlaceSelect}
        title="Create Item Group - Select Place"
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

  if (step === 'create-group' && selectedContainerId) {
    return (
      <CreateGroupModal
        isOpen={isOpen}
        onClose={handleClose}
        onGroupCreated={handleGroupCreated}
        type="item"
        parentId={selectedContainerId}
        showBackButton={true}
        onBack={handleBackFromGroup}
      />
    )
  }

  return null
}
