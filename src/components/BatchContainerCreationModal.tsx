import { useState, useCallback, useEffect, useRef } from 'react'
import { Modal, Button, Input, Switch, ColorPicker, Badge } from '@/components/ui'
import { Camera, Trash2, Plus, Check, ArrowLeft } from 'lucide-react'
import { generateAutoIncrementName } from '@/utils/naming'
import { useImageCompression } from '@/hooks/useImageCompression'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAuthStore } from '@/store/auth'
import {
    createContainer,
    uploadImageWithCleanup,
    generateQRCodeForContainer
} from '@/services/firebaseService'
import { getColorPalette, DEFAULT_CONTAINER_COLOR } from '@/utils/colorUtils'
import { useQueryClient } from '@tanstack/react-query'
import { isPlaceShared, canEditPlace } from '@/utils/placeUtils'

// ============================================
// TYPES
// ============================================

interface PendingContainer {
    tempId: string
    name: string
    photo: File | null
    photoPreviewUrl: string
}

type Step = 'select-place' | 'setup' | 'capture' | 'preview'

interface BatchContainerCreationModalProps {
    isOpen: boolean
    onClose: () => void
    onBatchCreated?: (containerIds: string[], placeId: string) => void
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface PlaceSelectorStepProps {
    onSelect: (placeId: string, placeName: string) => void
}

function PlaceSelectorStep({ onSelect }: PlaceSelectorStepProps) {
    const user = useAuthStore((state) => state.user)
    const { data: places, isLoading } = usePlaces()
    const editablePlaces = (places || []).filter((place) => canEditPlace(place, user?.uid))

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-aqua" />
            </div>
        )
    }

    if (!places || places.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-text-secondary mb-4">
                    You need to create a place first before adding containers.
                </p>
            </div>
        )
    }

    if (editablePlaces.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-text-secondary mb-4">
                    No places you can edit. Ask the owner to grant editor access.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <p className="text-text-secondary">
                Select the place where you want to add containers:
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                {editablePlaces.map(place => {
                    const shared = isPlaceShared(place, user?.uid)
                    return (
                    <button
                        key={place.id}
                        onClick={() => onSelect(place.id, place.name)}
                        className="flex items-center gap-3 p-4 rounded-xl border border-border-light
                       hover:border-accent-aqua hover:bg-accent-aqua/5 transition text-left"
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: (place.color || '#3B82F6') + '20' }}
                        >
                            <span>{place.icon || '📍'}</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-text-primary truncate">{place.name}</span>
                            {shared && (
                                <Badge size="sm" variant="info" className="flex-shrink-0">
                                    Shared
                                </Badge>
                            )}
                        </div>
                    </button>
                )})}
            </div>
        </div>
    )
}

interface SetupStepProps {
    useAutoIncrement: boolean
    setUseAutoIncrement: (value: boolean) => void
    templateName: string
    setTemplateName: (value: string) => void
    startNumber: number
    setStartNumber: (value: number) => void
    selectedColor: string
    setSelectedColor: (value: string) => void
    onBack: () => void
    onNext: () => void
}

function SetupStep({
    useAutoIncrement,
    setUseAutoIncrement,
    templateName,
    setTemplateName,
    startNumber,
    setStartNumber,
    selectedColor,
    setSelectedColor,
    onBack,
    onNext,
}: SetupStepProps) {
    // Generate preview names
    const previewNames = useAutoIncrement && templateName
        ? [
            generateAutoIncrementName(templateName, startNumber),
            generateAutoIncrementName(templateName, startNumber + 1),
            generateAutoIncrementName(templateName, startNumber + 2),
        ]
        : []

    const canProceed = !useAutoIncrement || templateName.trim().length > 0

    return (
        <div className="space-y-6">
            {/* Auto-increment toggle */}
            <div className="flex items-center justify-between p-4 bg-bg-surface rounded-xl">
                <div>
                    <p className="font-medium text-text-primary">Auto-increment names</p>
                    <p className="text-sm text-text-secondary">
                        Automatically number containers (e.g., "Box 01", "Box 02")
                    </p>
                </div>
                <Switch
                    checked={useAutoIncrement}
                    onCheckedChange={setUseAutoIncrement}
                />
            </div>

            {/* Template name input (shown if auto-increment enabled) */}
            {useAutoIncrement && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Template Name
                        </label>
                        <Input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="e.g., Holiday Bin, Storage Box"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Start from number
                        </label>
                        <Input
                            type="number"
                            min={1}
                            value={startNumber}
                            onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                    </div>

                    {/* Preview */}
                    {previewNames.length > 0 && (
                        <div className="p-4 bg-bg-surface rounded-xl">
                            <p className="text-sm text-text-secondary mb-2">Preview:</p>
                            <div className="flex flex-wrap gap-2">
                                {previewNames.map((name, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 bg-accent-aqua/10 text-accent-aqua rounded-full text-sm"
                                    >
                                        {name}
                                    </span>
                                ))}
                                <span className="text-text-tertiary">...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Color picker */}
            <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                    Container Color
                </label>
                <ColorPicker
                    colors={getColorPalette('container')}
                    selectedColor={selectedColor}
                    onColorSelect={setSelectedColor}
                    defaultColor={DEFAULT_CONTAINER_COLOR}
                />
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-4">
                <Button variant="secondary" onClick={onBack} className="flex-1">
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                </Button>
                <Button
                    variant="primary"
                    onClick={onNext}
                    disabled={!canProceed}
                    className="flex-1"
                >
                    Start Capturing
                </Button>
            </div>
        </div>
    )
}

interface CaptureStepProps {
    useAutoIncrement: boolean
    templateName: string
    startNumber: number
    pendingContainers: PendingContainer[]
    setPendingContainers: React.Dispatch<React.SetStateAction<PendingContainer[]>>
    onBack: () => void
    onDone: () => void
}

function CaptureStep({
    useAutoIncrement,
    templateName,
    startNumber,
    pendingContainers,
    setPendingContainers,
    onBack,
    onDone,
}: CaptureStepProps) {
    const [manualName, setManualName] = useState('')
    const [lastCapturedPhoto, setLastCapturedPhoto] = useState<{
        file: File
        previewUrl: string
    } | null>(null)

    const currentNumber = startNumber + pendingContainers.length
    const nextAutoName = useAutoIncrement
        ? generateAutoIncrementName(templateName, currentNumber)
        : ''

    // Handle photo capture from camera
    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)

            if (useAutoIncrement) {
                // Auto-increment mode: immediately add to pending
                addContainer(file, previewUrl, nextAutoName)
            } else {
                // Manual mode: show naming prompt
                setLastCapturedPhoto({ file, previewUrl })
            }
        }
        // Reset input so same file can be selected again
        e.target.value = ''
    }

    // Add container to pending list
    const addContainer = (file: File, previewUrl: string, name: string) => {
        const newContainer: PendingContainer = {
            tempId: crypto.randomUUID(),
            name: name || 'Container',
            photo: file,
            photoPreviewUrl: previewUrl,
        }
        setPendingContainers(prev => [...prev, newContainer])
        setLastCapturedPhoto(null)
        setManualName('')
    }

    // Handle manual name submission
    const handleManualSubmit = () => {
        if (lastCapturedPhoto) {
            addContainer(
                lastCapturedPhoto.file,
                lastCapturedPhoto.previewUrl,
                manualName || 'Container'
            )
        }
    }

    // Skip naming (use placeholder)
    const handleSkipNaming = () => {
        if (lastCapturedPhoto) {
            addContainer(
                lastCapturedPhoto.file,
                lastCapturedPhoto.previewUrl,
                'Container'
            )
        }
    }

    return (
        <div className="space-y-6">
            {/* Counter */}
            <div className="text-center">
                <p className="text-lg font-medium text-text-primary">
                    Container {pendingContainers.length + 1}
                </p>
                {useAutoIncrement && (
                    <p className="text-sm text-text-secondary">
                        Will be named: <span className="text-accent-aqua">{nextAutoName}</span>
                    </p>
                )}
            </div>

            {/* Manual naming prompt (shown after capture in manual mode) */}
            {lastCapturedPhoto && !useAutoIncrement && (
                <div className="space-y-4 p-4 bg-bg-surface rounded-xl">
                    <img
                        src={lastCapturedPhoto.previewUrl}
                        alt="Captured"
                        className="w-32 h-32 object-cover rounded-xl mx-auto"
                    />
                    <Input
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        placeholder="Enter container name (optional)"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleSkipNaming} className="flex-1">
                            Skip
                        </Button>
                        <Button variant="primary" onClick={handleManualSubmit} className="flex-1">
                            Save Name
                        </Button>
                    </div>
                </div>
            )}

            {/* Camera capture button */}
            {!lastCapturedPhoto && (
                <label className="block cursor-pointer">
                    <div className="h-48 bg-bg-surface rounded-xl border-2 border-dashed border-text-tertiary/30
                          hover:border-accent-aqua/50 transition flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-accent-aqua/10 flex items-center justify-center">
                            <Camera size={32} className="text-accent-aqua" />
                        </div>
                        <span className="font-medium text-text-primary">Tap to capture photo</span>
                    </div>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleCapture}
                    />
                </label>
            )}

            {/* Captured containers summary */}
            {pendingContainers.length > 0 && (
                <div className="p-4 bg-bg-surface rounded-xl">
                    <p className="text-sm text-text-secondary mb-2">
                        Captured: {pendingContainers.length} container{pendingContainers.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {pendingContainers.map(container => (
                            <div key={container.tempId} className="flex-shrink-0">
                                <img
                                    src={container.photoPreviewUrl}
                                    alt={container.name}
                                    className="w-12 h-12 object-cover rounded-lg"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-4">
                <Button variant="secondary" onClick={onBack}>
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                </Button>
                <Button
                    variant="primary"
                    onClick={onDone}
                    disabled={pendingContainers.length === 0}
                    className="flex-1"
                >
                    <Check size={18} className="mr-2" />
                    Done ({pendingContainers.length})
                </Button>
            </div>
        </div>
    )
}

interface PreviewStepProps {
    pendingContainers: PendingContainer[]
    setPendingContainers: React.Dispatch<React.SetStateAction<PendingContainer[]>>
    selectedPlaceName: string | null
    isSaving: boolean
    saveProgress: number
    onAddMore: () => void
    onSave: () => void
    onBack: () => void
}

function PreviewStep({
    pendingContainers,
    setPendingContainers,
    selectedPlaceName,
    isSaving,
    saveProgress,
    onAddMore,
    onSave,
    onBack,
}: PreviewStepProps) {
    // Update container name
    const handleNameChange = (tempId: string, newName: string) => {
        setPendingContainers(prev =>
            prev.map(c => c.tempId === tempId ? { ...c, name: newName } : c)
        )
    }

    // Delete container
    const handleDelete = (tempId: string) => {
        setPendingContainers(prev => {
            const container = prev.find(c => c.tempId === tempId)
            if (container?.photoPreviewUrl) {
                URL.revokeObjectURL(container.photoPreviewUrl)
            }
            return prev.filter(c => c.tempId !== tempId)
        })
    }

    // Replace photo
    const handleReplacePhoto = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)

            setPendingContainers(prev =>
                prev.map(c => {
                    if (c.tempId === tempId) {
                        // Clean up old preview URL
                        if (c.photoPreviewUrl) {
                            URL.revokeObjectURL(c.photoPreviewUrl)
                        }
                        return { ...c, photo: file, photoPreviewUrl: previewUrl }
                    }
                    return c
                })
            )
        }
        e.target.value = ''
    }

    if (isSaving) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-aqua" />
                <p className="text-text-primary font-medium">
                    Creating containers... {saveProgress} / {pendingContainers.length}
                </p>
                <div className="w-full max-w-xs bg-bg-surface rounded-full h-2">
                    <div
                        className="bg-accent-aqua h-2 rounded-full transition-all"
                        style={{ width: `${(saveProgress / pendingContainers.length) * 100}%` }}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium text-text-primary">
                        {pendingContainers.length} container{pendingContainers.length !== 1 ? 's' : ''} ready
                    </p>
                    <p className="text-sm text-text-secondary">
                        Going to: {selectedPlaceName}
                    </p>
                </div>
                <Button variant="secondary" size="sm" onClick={onAddMore}>
                    <Plus size={16} className="mr-1" />
                    Add More
                </Button>
            </div>

            {/* Container grid */}
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                {pendingContainers.map(container => (
                    <div
                        key={container.tempId}
                        className="bg-bg-surface rounded-xl p-3 space-y-3"
                    >
                        {/* Photo with replace option */}
                        <div className="relative aspect-square">
                            <img
                                src={container.photoPreviewUrl}
                                alt={container.name}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            <label className="absolute bottom-2 right-2 cursor-pointer">
                                <div className="w-8 h-8 bg-black/60 backdrop-blur-md rounded-full
                               flex items-center justify-center hover:bg-black/80 transition">
                                    <Camera size={14} className="text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => handleReplacePhoto(container.tempId, e)}
                                />
                            </label>
                        </div>

                        {/* Editable name */}
                        <Input
                            value={container.name}
                            onChange={(e) => handleNameChange(container.tempId, e.target.value)}
                            className="text-sm"
                        />

                        {/* Delete button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(container.tempId)}
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={14} className="mr-1" />
                            Remove
                        </Button>
                    </div>
                ))}
            </div>

            {/* QR code note */}
            <div className="p-3 bg-accent-aqua/10 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-aqua/20 flex items-center justify-center flex-shrink-0">
                    <span>🏷️</span>
                </div>
                <p className="text-sm text-text-secondary">
                    QR codes will be automatically generated for each container.
                </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
                <Button variant="secondary" onClick={onBack}>
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                </Button>
                <Button
                    variant="primary"
                    onClick={onSave}
                    disabled={pendingContainers.length === 0}
                    className="flex-1"
                >
                    Save All ({pendingContainers.length})
                </Button>
            </div>
        </div>
    )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function BatchContainerCreationModal({
    isOpen,
    onClose,
    onBatchCreated
}: BatchContainerCreationModalProps) {
    // ----- State -----
    const [currentStep, setCurrentStep] = useState<Step>('select-place')
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
    const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null)

    // Setup options
    const [useAutoIncrement, setUseAutoIncrement] = useState(true)
    const [templateName, setTemplateName] = useState('')
    const [startNumber, setStartNumber] = useState(1)
    const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_CONTAINER_COLOR)

    const [pendingContainers, setPendingContainers] = useState<PendingContainer[]>([])
    const pendingContainersRef = useRef<PendingContainer[]>(pendingContainers)

    // Update ref whenever pendingContainers change
    useEffect(() => {
        pendingContainersRef.current = pendingContainers
    }, [pendingContainers])

    // Saving state
    const [isSaving, setIsSaving] = useState(false)
    const [saveProgress, setSaveProgress] = useState(0)

    // ----- Hooks -----
    const { compress } = useImageCompression()
    const queryClient = useQueryClient()

    // ----- Handlers -----

    // Reset all state
    const resetState = useCallback(() => {
        // Clean up blob URLs to prevent memory leaks
        pendingContainers.forEach(container => {
            if (container.photoPreviewUrl) {
                URL.revokeObjectURL(container.photoPreviewUrl)
            }
        })

        setCurrentStep('select-place')
        setSelectedPlaceId(null)
        setSelectedPlaceName(null)
        setUseAutoIncrement(true)
        setTemplateName('')
        setStartNumber(1)
        setSelectedColor(DEFAULT_CONTAINER_COLOR)
        setPendingContainers([])
        setIsSaving(false)
        setSaveProgress(0)
    }, [pendingContainers])

    const handleClose = useCallback(() => {
        if (pendingContainers.length > 0) {
            const confirmed = window.confirm(
                `You have ${pendingContainers.length} unsaved container(s). Are you sure you want to cancel?`
            )
            if (!confirmed) return
        }
        resetState()
        onClose()
    }, [pendingContainers.length, resetState, onClose])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            pendingContainersRef.current.forEach((container: PendingContainer) => {
                if (container.photoPreviewUrl) {
                    URL.revokeObjectURL(container.photoPreviewUrl)
                }
            })
        }
    }, [])

    // ----- Save All Handler -----
    async function handleSaveAll() {
        if (!selectedPlaceId || pendingContainers.length === 0) return

        setIsSaving(true)
        setSaveProgress(0)

        const createdIds: string[] = []
        const errors: string[] = []

        for (let i = 0; i < pendingContainers.length; i++) {
            const pending = pendingContainers[i]

            try {
                // 1. Compress photo (if exists)
                let photoUrls: string[] = []

                if (pending.photo) {
                    const compressedPhoto = await compress(pending.photo, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    })

                    // 2. Upload photo
                    const fileName = `${Date.now()}_${crypto.randomUUID()}.jpg`
                    const storagePath = `container-media/${selectedPlaceId}/${fileName}`

                    const photoUrl = await uploadImageWithCleanup(
                        compressedPhoto,
                        storagePath,
                        async () => { } // onSuccess callback (optional)
                    )

                    if (photoUrl) {
                        photoUrls = [photoUrl]
                    }
                }

                // 3. Create container
                const containerId = await createContainer({
                    placeId: selectedPlaceId,
                    name: pending.name,
                    photos: photoUrls,
                    photoUrl: photoUrls[0] || undefined, // Legacy field
                    color: selectedColor,
                    // Icon will be set to default via getContainerIcon() when displayed
                    lastAccessed: new Date(),
                })

                // 4. Generate QR code
                if (containerId) {
                    await generateQRCodeForContainer(containerId)
                    createdIds.push(containerId)
                }

            } catch (error) {
                console.error(`Failed to create container ${pending.name}:`, error)
                errors.push(pending.name)
            }

            setSaveProgress(i + 1)
        }

        // 5. Invalidate queries to refresh UI
        await queryClient.invalidateQueries({ queryKey: ['containers'] })
        await queryClient.invalidateQueries({ queryKey: ['place', selectedPlaceId] })

        // 6. Show result and close
        if (errors.length > 0) {
            console.error(`Failed to create: ${errors.join(', ')}`)
        }

        // Notify parent of created containers
        if (onBatchCreated && createdIds.length > 0 && selectedPlaceId) {
            onBatchCreated(createdIds, selectedPlaceId)
        }

        // Clean up and close
        resetState()
        onClose()
    }

    // ----- Render -----

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Batch Create Containers"
            size="full"
        >
            <div className="flex flex-col min-h-[400px]">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6 text-sm text-text-secondary">
                    <span className={currentStep === 'select-place' ? 'text-accent-aqua font-medium' : ''}>
                        1. Place
                    </span>
                    <span>→</span>
                    <span className={currentStep === 'setup' ? 'text-accent-aqua font-medium' : ''}>
                        2. Setup
                    </span>
                    <span>→</span>
                    <span className={currentStep === 'capture' ? 'text-accent-aqua font-medium' : ''}>
                        3. Capture
                    </span>
                    <span>→</span>
                    <span className={currentStep === 'preview' ? 'text-accent-aqua font-medium' : ''}>
                        4. Preview
                    </span>
                </div>

                {/* Step content */}
                <div className="flex-1">
                    {currentStep === 'select-place' && (
                        <PlaceSelectorStep
                            onSelect={(placeId, placeName) => {
                                setSelectedPlaceId(placeId)
                                setSelectedPlaceName(placeName)
                                setCurrentStep('setup')
                            }}
                        />
                    )}

                    {currentStep === 'setup' && (
                        <SetupStep
                            useAutoIncrement={useAutoIncrement}
                            setUseAutoIncrement={setUseAutoIncrement}
                            templateName={templateName}
                            setTemplateName={setTemplateName}
                            startNumber={startNumber}
                            setStartNumber={setStartNumber}
                            selectedColor={selectedColor}
                            setSelectedColor={setSelectedColor}
                            onBack={() => setCurrentStep('select-place')}
                            onNext={() => setCurrentStep('capture')}
                        />
                    )}

                    {currentStep === 'capture' && (
                        <CaptureStep
                            useAutoIncrement={useAutoIncrement}
                            templateName={templateName}
                            startNumber={startNumber}
                            pendingContainers={pendingContainers}
                            setPendingContainers={setPendingContainers}
                            onBack={() => setCurrentStep('setup')}
                            onDone={() => setCurrentStep('preview')}
                        />
                    )}

                    {currentStep === 'preview' && (
                        <PreviewStep
                            pendingContainers={pendingContainers}
                            setPendingContainers={setPendingContainers}
                            selectedPlaceName={selectedPlaceName}
                            isSaving={isSaving}
                            saveProgress={saveProgress}
                            onAddMore={() => setCurrentStep('capture')}
                            onSave={() => handleSaveAll()}
                            onBack={() => setCurrentStep('capture')}
                        />
                    )}
                </div>
            </div>
        </Modal>
    )
}
