import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Modal, Button, Input } from '@/components/ui'
import { TagInput } from '@/components/ui/TagInput'
import { Camera, Trash2, Plus, Check, ArrowLeft, Search } from 'lucide-react'
import { generateAutoIncrementName } from '@/utils/naming'
import { useImageCompression } from '@/hooks/useImageCompression'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { usePlaceContainers } from '@/hooks/queries/useContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import {
    createItem,
    uploadImage,
} from '@/services/firebaseService'
import { DEFAULT_ITEM_COLOR } from '@/utils/colorUtils'
import { getContainerIcon, isEmoji } from '@/utils/colorUtils'
import { useQueryClient } from '@tanstack/react-query'
import { auth } from '@/lib/firebase'

// ============================================
// TYPES
// ============================================

interface PendingItem {
    tempId: string
    name: string
    photo: File | null
    photoPreviewUrl: string
}

type Step = 'select-place' | 'select-container' | 'setup' | 'capture' | 'preview'

interface BatchItemCreationModalProps {
    isOpen: boolean
    onClose: () => void
    onBatchCreated?: (itemIds: string[], containerId: string) => void
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface PlaceSelectorStepProps {
    onSelect: (placeId: string, placeName: string) => void
}

function PlaceSelectorStep({ onSelect }: PlaceSelectorStepProps) {
    const { data: places, isLoading } = usePlaces()
    const [search, setSearch] = useState('')

    const filteredPlaces = useMemo(() => {
        if (!places) return []
        if (!search.trim()) return places
        const q = search.toLowerCase()
        return places.filter(p => p.name.toLowerCase().includes(q))
    }, [places, search])

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
                    You need to create a place first before adding items.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <p className="text-text-secondary">
                Select the place where your items will go:
            </p>

            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search places..."
                    className="pl-10"
                />
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                {filteredPlaces.map(place => (
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
                        <span className="font-medium text-text-primary">{place.name}</span>
                    </button>
                ))}
                {filteredPlaces.length === 0 && (
                    <p className="text-center text-text-tertiary py-6">No places match your search</p>
                )}
            </div>
        </div>
    )
}

interface ContainerSelectorStepProps {
    placeId: string
    placeName: string
    onSelect: (containerId: string, containerName: string) => void
    onBack: () => void
}

function ContainerSelectorStep({ placeId, placeName, onSelect, onBack }: ContainerSelectorStepProps) {
    const { data: containers, isLoading } = usePlaceContainers(placeId)
    const ContainerIcon = getContainerIcon()
    const [search, setSearch] = useState('')

    const filteredContainers = useMemo(() => {
        if (!containers) return []
        if (!search.trim()) return containers
        const q = search.toLowerCase()
        return containers.filter(c => c.name.toLowerCase().includes(q))
    }, [containers, search])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-aqua" />
            </div>
        )
    }

    if (!containers || containers.length === 0) {
        return (
            <div className="space-y-6">
                <div className="text-center py-12">
                    <p className="text-text-secondary mb-4">
                        No containers found in <span className="font-medium text-text-primary">{placeName}</span>. Create a container first.
                    </p>
                </div>
                <Button variant="secondary" onClick={onBack}>
                    <ArrowLeft size={18} className="mr-2" />
                    Back
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <p className="text-text-secondary">
                Select the container in <span className="font-medium text-text-primary">{placeName}</span>:
            </p>

            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search containers..."
                    className="pl-10"
                />
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                {filteredContainers.map(container => (
                    <button
                        key={container.id}
                        onClick={() => onSelect(container.id, container.name)}
                        className="flex items-center gap-3 p-4 rounded-xl border border-border-light
                       hover:border-accent-aqua hover:bg-accent-aqua/5 transition text-left"
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: (container.color || '#3B82F6') + '20' }}
                        >
                            {isEmoji(container.icon) ? (
                                <span>{container.icon}</span>
                            ) : (
                                <ContainerIcon size={20} style={{ color: container.color || '#3B82F6' }} />
                            )}
                        </div>
                        <span className="font-medium text-text-primary">{container.name}</span>
                    </button>
                ))}
                {filteredContainers.length === 0 && (
                    <p className="text-center text-text-tertiary py-6">No containers match your search</p>
                )}
            </div>

            <Button variant="secondary" onClick={onBack}>
                <ArrowLeft size={18} className="mr-2" />
                Back
            </Button>
        </div>
    )
}

interface SetupStepProps {
    templateName: string
    setTemplateName: (value: string) => void
    sharedTags: string[]
    setSharedTags: (tags: string[]) => void
    tagSuggestions: string[]
    onBack: () => void
    onNext: () => void
}

function SetupStep({
    templateName,
    setTemplateName,
    sharedTags,
    setSharedTags,
    tagSuggestions,
    onBack,
    onNext,
}: SetupStepProps) {
    const [isRenaming, setIsRenaming] = useState(false)

    const previewNames = templateName
        ? [
            generateAutoIncrementName(templateName, 1),
            generateAutoIncrementName(templateName, 2),
            generateAutoIncrementName(templateName, 3),
        ]
        : []

    return (
        <div className="space-y-6">
            {/* Item name display / edit */}
            <div className="p-4 bg-bg-surface rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-primary">
                        Item name
                    </label>
                    {!isRenaming && (
                        <Button variant="ghost" size="sm" onClick={() => setIsRenaming(true)}>
                            Rename
                        </Button>
                    )}
                </div>

                {isRenaming ? (
                    <div className="flex gap-2">
                        <Input
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            placeholder="e.g., Tool, Part, Component"
                            autoFocus
                        />
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setIsRenaming(false)}
                            disabled={!templateName.trim()}
                        >
                            Done
                        </Button>
                    </div>
                ) : (
                    <p className="text-text-primary font-medium">{templateName}</p>
                )}

                {/* Preview */}
                {previewNames.length > 0 && (
                    <div className="pt-2">
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

            {/* Shared tags */}
            <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                    Tags (applied to all items)
                </label>
                <TagInput
                    tags={sharedTags}
                    onChange={setSharedTags}
                    suggestions={tagSuggestions}
                    placeholder="Add tags..."
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
                    disabled={!templateName.trim()}
                    className="flex-1"
                >
                    Start Capturing
                </Button>
            </div>
        </div>
    )
}

interface CaptureStepProps {
    templateName: string
    pendingItems: PendingItem[]
    setPendingItems: React.Dispatch<React.SetStateAction<PendingItem[]>>
    onBack: () => void
    onDone: () => void
}

function CaptureStep({
    templateName,
    pendingItems,
    setPendingItems,
    onBack,
    onDone,
}: CaptureStepProps) {
    const currentNumber = 1 + pendingItems.length
    const nextAutoName = generateAutoIncrementName(templateName, currentNumber)

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)
            const newItem: PendingItem = {
                tempId: crypto.randomUUID(),
                name: nextAutoName,
                photo: file,
                photoPreviewUrl: previewUrl,
            }
            setPendingItems(prev => [...prev, newItem])
        }
        e.target.value = ''
    }

    return (
        <div className="space-y-6">
            {/* Counter */}
            <div className="text-center">
                <p className="text-lg font-medium text-text-primary">
                    Item {pendingItems.length + 1}
                </p>
                <p className="text-sm text-text-secondary">
                    Will be named: <span className="text-accent-aqua">{nextAutoName}</span>
                </p>
            </div>

            {/* Camera capture button */}
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

            {/* Captured items summary */}
            {pendingItems.length > 0 && (
                <div className="p-4 bg-bg-surface rounded-xl">
                    <p className="text-sm text-text-secondary mb-2">
                        Captured: {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {pendingItems.map(item => (
                            <div key={item.tempId} className="flex-shrink-0">
                                <img
                                    src={item.photoPreviewUrl}
                                    alt={item.name}
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
                    disabled={pendingItems.length === 0}
                    className="flex-1"
                >
                    <Check size={18} className="mr-2" />
                    Done ({pendingItems.length})
                </Button>
            </div>
        </div>
    )
}

interface PreviewStepProps {
    pendingItems: PendingItem[]
    setPendingItems: React.Dispatch<React.SetStateAction<PendingItem[]>>
    selectedPlaceName: string | null
    selectedContainerName: string | null
    sharedTags: string[]
    isSaving: boolean
    saveProgress: number
    onAddMore: () => void
    onSave: () => void
    onBack: () => void
}

function PreviewStep({
    pendingItems,
    setPendingItems,
    selectedPlaceName,
    selectedContainerName,
    sharedTags,
    isSaving,
    saveProgress,
    onAddMore,
    onSave,
    onBack,
}: PreviewStepProps) {
    const handleNameChange = (tempId: string, newName: string) => {
        setPendingItems(prev =>
            prev.map(item => item.tempId === tempId ? { ...item, name: newName } : item)
        )
    }

    const handleDelete = (tempId: string) => {
        setPendingItems(prev => {
            const item = prev.find(i => i.tempId === tempId)
            if (item?.photoPreviewUrl) {
                URL.revokeObjectURL(item.photoPreviewUrl)
            }
            return prev.filter(i => i.tempId !== tempId)
        })
    }

    const handleReplacePhoto = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const previewUrl = URL.createObjectURL(file)

            setPendingItems(prev =>
                prev.map(item => {
                    if (item.tempId === tempId) {
                        if (item.photoPreviewUrl) {
                            URL.revokeObjectURL(item.photoPreviewUrl)
                        }
                        return { ...item, photo: file, photoPreviewUrl: previewUrl }
                    }
                    return item
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
                    Creating items... {saveProgress} / {pendingItems.length}
                </p>
                <div className="w-full max-w-xs bg-bg-surface rounded-full h-2">
                    <div
                        className="bg-accent-aqua h-2 rounded-full transition-all"
                        style={{ width: `${(saveProgress / pendingItems.length) * 100}%` }}
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
                        {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} ready
                    </p>
                    <p className="text-sm text-text-secondary">
                        Going to: {selectedContainerName} in {selectedPlaceName}
                    </p>
                </div>
                <Button variant="secondary" size="sm" onClick={onAddMore}>
                    <Plus size={16} className="mr-1" />
                    Add More
                </Button>
            </div>

            {/* Shared tags summary */}
            {sharedTags.length > 0 && (
                <div className="p-3 bg-accent-aqua/10 rounded-xl">
                    <p className="text-sm text-text-secondary mb-1.5">Tags applied to all items:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {sharedTags.map(tag => (
                            <span
                                key={tag}
                                className="inline-flex items-center bg-accent-aqua/20 text-accent-aqua text-[12px] font-medium px-2.5 py-1 rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Item grid */}
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                {pendingItems.map(item => (
                    <div
                        key={item.tempId}
                        className="bg-bg-surface rounded-xl p-3 space-y-3"
                    >
                        {/* Photo with replace option */}
                        <div className="relative aspect-square">
                            <img
                                src={item.photoPreviewUrl}
                                alt={item.name}
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
                                    onChange={(e) => handleReplacePhoto(item.tempId, e)}
                                />
                            </label>
                        </div>

                        {/* Editable name */}
                        <Input
                            value={item.name}
                            onChange={(e) => handleNameChange(item.tempId, e.target.value)}
                            className="text-sm border border-border-light"
                        />

                        {/* Delete button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(item.tempId)}
                            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={14} className="mr-1" />
                            Remove
                        </Button>
                    </div>
                ))}
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
                    disabled={pendingItems.length === 0}
                    className="flex-1"
                >
                    Save All ({pendingItems.length})
                </Button>
            </div>
        </div>
    )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function BatchItemCreationModal({
    isOpen,
    onClose,
    onBatchCreated
}: BatchItemCreationModalProps) {
    // ----- State -----
    const [currentStep, setCurrentStep] = useState<Step>('select-place')
    const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
    const [selectedPlaceName, setSelectedPlaceName] = useState<string | null>(null)
    const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null)
    const [selectedContainerName, setSelectedContainerName] = useState<string | null>(null)

    // Setup options
    const [templateName, setTemplateName] = useState('Item')
    const [sharedTags, setSharedTags] = useState<string[]>([])

    const [pendingItems, setPendingItems] = useState<PendingItem[]>([])
    const pendingItemsRef = useRef<PendingItem[]>(pendingItems)

    // Update ref whenever pendingItems change
    useEffect(() => {
        pendingItemsRef.current = pendingItems
    }, [pendingItems])

    // Saving state
    const [isSaving, setIsSaving] = useState(false)
    const [saveProgress, setSaveProgress] = useState(0)

    // ----- Hooks -----
    const { compress } = useImageCompression()
    const queryClient = useQueryClient()

    // Tag suggestions from all existing items
    const { data: allItems } = useAllItems()
    const tagSuggestions = useMemo(() => {
        if (!allItems) return []
        const tagSet = new Set<string>()
        allItems.forEach(item => {
            item.tags?.forEach(tag => tagSet.add(tag))
        })
        return Array.from(tagSet).sort()
    }, [allItems])

    // ----- Handlers -----

    const resetState = useCallback(() => {
        pendingItems.forEach(item => {
            if (item.photoPreviewUrl) {
                URL.revokeObjectURL(item.photoPreviewUrl)
            }
        })

        setCurrentStep('select-place')
        setSelectedPlaceId(null)
        setSelectedPlaceName(null)
        setSelectedContainerId(null)
        setSelectedContainerName(null)
        setTemplateName('Item')
        setSharedTags([])
        setPendingItems([])
        setIsSaving(false)
        setSaveProgress(0)
    }, [pendingItems])

    const handleClose = useCallback(() => {
        if (pendingItems.length > 0) {
            const confirmed = window.confirm(
                `You have ${pendingItems.length} unsaved item(s). Are you sure you want to cancel?`
            )
            if (!confirmed) return
        }
        resetState()
        onClose()
    }, [pendingItems.length, resetState, onClose])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            pendingItemsRef.current.forEach((item: PendingItem) => {
                if (item.photoPreviewUrl) {
                    URL.revokeObjectURL(item.photoPreviewUrl)
                }
            })
        }
    }, [])

    // ----- Save All Handler -----
    async function handleSaveAll() {
        if (!selectedContainerId || pendingItems.length === 0) return

        setIsSaving(true)
        setSaveProgress(0)

        const createdIds: string[] = []
        const errors: string[] = []

        for (let i = 0; i < pendingItems.length; i++) {
            const pending = pendingItems[i]

            try {
                let photoUrls: string[] = []

                if (pending.photo) {
                    const compressedPhoto = await compress(pending.photo, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    })

                    const fileName = `${Date.now()}_${crypto.randomUUID()}.jpg`
                    const storagePath = `items/${auth.currentUser?.uid}/${fileName}`

                    const photoUrl = await uploadImage(compressedPhoto, storagePath)
                    if (photoUrl) {
                        photoUrls = [photoUrl]
                    }
                }

                const itemId = await createItem({
                    name: pending.name,
                    containerId: selectedContainerId,
                    photos: photoUrls,
                    tags: sharedTags,
                    color: DEFAULT_ITEM_COLOR,
                    quantity: 1,
                })

                if (itemId) {
                    createdIds.push(itemId)
                }
            } catch (error) {
                console.error(`Failed to create item ${pending.name}:`, error)
                errors.push(pending.name)
            }

            setSaveProgress(i + 1)
        }

        // Invalidate queries to refresh UI
        await queryClient.invalidateQueries({ queryKey: ['items'] })
        await queryClient.invalidateQueries({ queryKey: ['containers'] })

        if (errors.length > 0) {
            console.error(`Failed to create: ${errors.join(', ')}`)
        }

        if (onBatchCreated && createdIds.length > 0 && selectedContainerId) {
            onBatchCreated(createdIds, selectedContainerId)
        }

        resetState()
        onClose()
    }

    // ----- Render -----

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Batch Create Items"
            size="full"
        >
            <div className="flex flex-col min-h-[400px]">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6 text-sm text-text-secondary">
                    <span className={currentStep === 'select-place' ? 'text-accent-aqua font-medium' : ''}>
                        1. Place
                    </span>
                    <span>→</span>
                    <span className={currentStep === 'select-container' ? 'text-accent-aqua font-medium' : ''}>
                        2. Container
                    </span>
                    <span>→</span>
                    <span className={currentStep === 'setup' ? 'text-accent-aqua font-medium' : ''}>
                        3. Setup
                    </span>
                    <span>→</span>
                    <span className={currentStep === 'capture' ? 'text-accent-aqua font-medium' : ''}>
                        4. Capture
                    </span>
                    <span>→</span>
                    <span className={currentStep === 'preview' ? 'text-accent-aqua font-medium' : ''}>
                        5. Preview
                    </span>
                </div>

                {/* Step content */}
                <div className="flex-1">
                    {currentStep === 'select-place' && (
                        <PlaceSelectorStep
                            onSelect={(placeId, placeName) => {
                                setSelectedPlaceId(placeId)
                                setSelectedPlaceName(placeName)
                                setCurrentStep('select-container')
                            }}
                        />
                    )}

                    {currentStep === 'select-container' && selectedPlaceId && (
                        <ContainerSelectorStep
                            placeId={selectedPlaceId}
                            placeName={selectedPlaceName || ''}
                            onSelect={(containerId, containerName) => {
                                setSelectedContainerId(containerId)
                                setSelectedContainerName(containerName)
                                setCurrentStep('setup')
                            }}
                            onBack={() => setCurrentStep('select-place')}
                        />
                    )}

                    {currentStep === 'setup' && (
                        <SetupStep
                            templateName={templateName}
                            setTemplateName={setTemplateName}
                            sharedTags={sharedTags}
                            setSharedTags={setSharedTags}
                            tagSuggestions={tagSuggestions}
                            onBack={() => setCurrentStep('select-container')}
                            onNext={() => setCurrentStep('capture')}
                        />
                    )}

                    {currentStep === 'capture' && (
                        <CaptureStep
                            templateName={templateName}
                            pendingItems={pendingItems}
                            setPendingItems={setPendingItems}
                            onBack={() => setCurrentStep('setup')}
                            onDone={() => setCurrentStep('preview')}
                        />
                    )}

                    {currentStep === 'preview' && (
                        <PreviewStep
                            pendingItems={pendingItems}
                            setPendingItems={setPendingItems}
                            selectedPlaceName={selectedPlaceName}
                            selectedContainerName={selectedContainerName}
                            sharedTags={sharedTags}
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
