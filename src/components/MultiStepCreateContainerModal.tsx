import { useState } from 'react'
import { PlaceSelector } from './PlaceSelector'
import { CreateContainerModal } from './CreateContainerModal'

type Step = 'select-place' | 'enter-details'

export function MultiStepCreateContainerModal({
  isOpen,
  onClose,
  onContainerCreated
}: {
  isOpen: boolean
  onClose: () => void
  onContainerCreated: () => void
}) {
  const [step, setStep] = useState<Step>('select-place')
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId)
    setStep('enter-details')
  }

  const handleBack = () => {
    if (step === 'enter-details') {
      setStep('select-place')
      setSelectedPlaceId(null)
    }
  }

  const handleClose = () => {
    setStep('select-place')
    setSelectedPlaceId(null)
    onClose()
  }

  const handleContainerCreated = () => {
    handleClose()
    onContainerCreated()
  }

  if (step === 'select-place') {
    return (
      <PlaceSelector
        isOpen={isOpen}
        onClose={handleClose}
        onPlaceSelect={handlePlaceSelect}
        title="Create Container - Select Place"
        filterMode="editable"
      />
    )
  }

  if (step === 'enter-details' && selectedPlaceId) {
    return (
      <CreateContainerModal
        isOpen={isOpen}
        onClose={handleClose}
        onContainerCreated={handleContainerCreated}
        placeId={selectedPlaceId}
        showBackButton={true}
        onBack={handleBack}
      />
    )
  }

  return null
}
