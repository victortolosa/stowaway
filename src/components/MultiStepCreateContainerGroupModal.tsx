import { useState } from 'react'
import { PlaceSelector } from './PlaceSelector'
import { CreateGroupModal } from './CreateGroupModal'

type Step = 'select-place' | 'create-group'

export function MultiStepCreateContainerGroupModal({
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

  const handlePlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId)
    setStep('create-group')
  }

  const handleBack = () => {
    if (step === 'create-group') {
      setStep('select-place')
      setSelectedPlaceId(null)
    }
  }

  const handleClose = () => {
    setStep('select-place')
    setSelectedPlaceId(null)
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
        title="Create Container Group - Select Place"
      />
    )
  }

  if (step === 'create-group' && selectedPlaceId) {
    return (
      <CreateGroupModal
        isOpen={isOpen}
        onClose={handleClose}
        onGroupCreated={handleGroupCreated}
        type="container"
        parentId={selectedPlaceId}
        showBackButton={true}
        onBack={handleBack}
      />
    )
  }

  return null
}
