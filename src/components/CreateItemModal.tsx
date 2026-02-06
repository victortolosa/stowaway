import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mic, X, Camera, Folder, Plus, Minus, Hash, Tag } from 'lucide-react'
import { createItem, updateItem, uploadImage, uploadAudio, deleteStorageFile } from '@/services/firebaseService'
import { deleteField } from 'firebase/firestore'
import { useAuthStore } from '@/store/auth'
import { useImageCompression } from '@/hooks'
import { useGroups } from '@/hooks/queries/useGroups'
import { useContainer } from '@/hooks/queries/useContainers'
import { AudioRecorder } from './AudioRecorder'
import { AudioPlayer } from './AudioPlayer'
import { trimSilence } from '@/utils/audioUtils'
import { Item } from '@/types'
import { Modal, Button, Input, Textarea, FormField, Label, MultiImageUploader, ProgressBar, Select, EmojiPicker, IconOrEmoji, TagInput, ConfirmDialog } from '@/components/ui'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { getItemIcon, DEFAULT_ITEM_COLOR } from '@/utils/colorUtils'

const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    groupId: z.string().optional(),
    quantity: z.number().min(0, 'Quantity must be 0 or greater').optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface CreateItemModalProps {
    isOpen: boolean
    onClose: () => void
    onItemCreated: () => void
    containerId: string
    editMode?: boolean
    initialData?: Item
    preselectedGroupId?: string | null
    showBackButton?: boolean
    onBack?: () => void
}

export function CreateItemModal({
    isOpen,
    onClose,
    onItemCreated,
    containerId,
    editMode = false,
    initialData,
    preselectedGroupId,
    showBackButton = false,
    onBack
}: CreateItemModalProps) {
    const user = useAuthStore((state) => state.user)
    const { data: groups = [] } = useGroups()
    const { data: allItems = [] } = useAllItems()
    const { data: container } = useContainer(containerId)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [images, setImages] = useState<(File | string)[]>([])
    const [tags, setTags] = useState<string[]>([])

    // Derive tag suggestions from all user items
    const tagSuggestions = [...new Set(allItems.flatMap(i => i.tags || []))]

    // Audio state
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
    const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null)
    const [wasAudioDeleted, setWasAudioDeleted] = useState(false)
    const [showAudioRecorder, setShowAudioRecorder] = useState(false)
    const [isTrimming, setIsTrimming] = useState(false)

    // Emoji state
    const [selectedEmoji, setSelectedEmoji] = useState<string>('')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    // Toggle states for metadata sections
    const [showGroupSection, setShowGroupSection] = useState(false)
    const [showPhotosSection, setShowPhotosSection] = useState(false)
    const [showVoiceNotesSection, setShowVoiceNotesSection] = useState(false)
    const [showQuantitySection, setShowQuantitySection] = useState(false)
    const [showTagsSection, setShowTagsSection] = useState(false)

    // Confirmation dialog for removing metadata
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
    const [pendingFormData, setPendingFormData] = useState<ItemFormValues | null>(null)
    const [removedSectionNames, setRemovedSectionNames] = useState<string[]>([])

    const itemGroups = groups.filter(g => g.type === 'item' && g.parentId === containerId)

    const { compress, isCompressing, progress } = useImageCompression()

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            groupId: '',
            quantity: 1,
        },
    })

    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
                description: initialData.description || '',
                groupId: initialData.groupId || '',
                quantity: initialData.quantity ?? 1,
            })
            setImages(initialData.photos || [])
            setAudioBlob(null)
            setExistingAudioUrl(initialData.voiceNoteUrl || null)
            setWasAudioDeleted(false)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
            setSelectedEmoji(initialData.icon || '')
            setShowEmojiPicker(false)

            setTags(initialData.tags || [])

            // Auto-enable toggles based on existing data
            setShowGroupSection(!!initialData.groupId)
            setShowPhotosSection(!!initialData.photos?.length)
            setShowVoiceNotesSection(!!initialData.voiceNoteUrl)
            setShowQuantitySection(initialData.quantity !== undefined && initialData.quantity !== null)
            setShowTagsSection(!!initialData.tags?.length)
        } else if (isOpen && !editMode) {
            reset({
                name: '',
                description: '',
                groupId: preselectedGroupId || '',
                quantity: 1,
            })
            setImages([])
            setAudioBlob(null)
            setExistingAudioUrl(null)
            setWasAudioDeleted(false)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
            setSelectedEmoji('')
            setShowEmojiPicker(false)

            setTags([])

            // Reset toggles to default (hidden)
            setShowGroupSection(!!preselectedGroupId)
            setShowPhotosSection(false)
            setShowVoiceNotesSection(false)
            setShowQuantitySection(false)
            setShowTagsSection(false)
        }
    }, [isOpen, editMode, initialData, reset, audioPreviewUrl, preselectedGroupId])

    useEffect(() => {
        return () => {
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
        }
    }, [audioPreviewUrl])

    // Detect which sections were toggled off but had data
    const getToggledOffSectionsWithData = (): string[] => {
        const removed: string[] = []
        if (!showGroupSection && (editMode ? !!initialData?.groupId : !!watch('groupId'))) removed.push('Group')
        if (!showPhotosSection && (editMode ? !!initialData?.photos?.length : images.length > 0)) removed.push('Photos')
        if (!showVoiceNotesSection && (editMode ? !!initialData?.voiceNoteUrl : !!(audioBlob || existingAudioUrl))) removed.push('Voice Notes')
        if (!showQuantitySection && (editMode ? (initialData?.quantity !== undefined && initialData?.quantity !== null) : (watch('quantity') !== undefined && watch('quantity') !== 1))) removed.push('Quantity')
        if (!showTagsSection && (editMode ? !!initialData?.tags?.length : tags.length > 0)) removed.push('Tags')
        return removed
    }

    const onSubmit = async (data: ItemFormValues) => {
        if (!user) return

        // Check for toggled-off sections with data
        const removed = getToggledOffSectionsWithData()
        if (removed.length > 0) {
            setRemovedSectionNames(removed)
            setPendingFormData(data)
            setShowRemoveConfirm(true)
            return
        }

        await performSubmit(data)
    }

    const performSubmit = async (data: ItemFormValues) => {
        if (!user) return

        setIsSubmitting(true)
        const uploadedPaths: string[] = []
        try {
            // Respect toggle states: clear data for toggled-off sections
            const effectivePhotos = showPhotosSection ? images : []
            const effectiveTags = showTagsSection ? tags : []
            const effectiveGroupId = showGroupSection ? (data.groupId || null) : null
            const effectiveQuantity = showQuantitySection ? data.quantity : undefined
            const hasAudio = showVoiceNotesSection

            const newPhotos: string[] = []
            const existingPhotos: string[] = []

            // Separate existing URLs from new Files
            for (const img of effectivePhotos) {
                if (typeof img === 'string') {
                    existingPhotos.push(img)
                }
            }

            const placeIdForMedia = container?.placeId || initialData?.placeId || ''

            // Upload new files
            const filesToUpload = effectivePhotos.filter(img => img instanceof File) as File[]

            for (const file of filesToUpload) {
                const compressedPhoto = await compress(file, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                })

                const ext = compressedPhoto.type.split('/')[1] || 'jpg'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const photoPath = placeIdForMedia
                    ? `item-media/${placeIdForMedia}/${filename}`
                    : `items/${user.uid}/${filename}`
                const url = await uploadImage(compressedPhoto, photoPath)
                newPhotos.push(url)
                uploadedPaths.push(photoPath)
            }

            const finalPhotos = [...existingPhotos, ...newPhotos]

            let audioUrl = ''
            if (hasAudio && audioBlob) {
                const ext = (audioBlob.type && audioBlob.type.split('/')[1]) || 'webm'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const audioFile = new File([audioBlob], filename, {
                    type: audioBlob.type || 'audio/webm',
                })
                const audioPath = placeIdForMedia
                    ? `item-media/${placeIdForMedia}/audio/${filename}`
                    : `items/${user.uid}/audio/${filename}`
                audioUrl = await uploadAudio(audioFile, audioPath)
                uploadedPaths.push(audioPath)
            }

            const itemData = {
                ...data,
                photos: finalPhotos,
                groupId: effectiveGroupId,
                quantity: effectiveQuantity,
            }

            if (editMode && initialData) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updatePayload: any = {
                    ...itemData,
                    tags: effectiveTags,
                    color: DEFAULT_ITEM_COLOR,
                    icon: selectedEmoji || initialData.icon,
                }

                // Handle audio based on toggle state
                if (!hasAudio) {
                    // Voice notes toggled off - delete existing audio
                    if (initialData.voiceNoteUrl) {
                        updatePayload.voiceNoteUrl = deleteField()
                    }
                } else if (audioUrl) {
                    updatePayload.voiceNoteUrl = audioUrl
                } else if (wasAudioDeleted) {
                    updatePayload.voiceNoteUrl = deleteField()
                }

                // Handle quantity based on toggle state
                if (!showQuantitySection) {
                    if (initialData.quantity !== undefined && initialData.quantity !== null) {
                        updatePayload.quantity = deleteField()
                    }
                }

                await updateItem(initialData.id, updatePayload)
            } else {
                await createItem({
                    name: itemData.name,
                    description: itemData.description,
                    containerId,
                    photos: finalPhotos,
                    tags: effectiveTags,
                    voiceNoteUrl: audioUrl || undefined,
                    groupId: effectiveGroupId,
                    color: DEFAULT_ITEM_COLOR,
                    icon: selectedEmoji,
                    quantity: effectiveQuantity,
                })
            }

            reset()
            setImages([])
            setTags([])
            setAudioBlob(null)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
            onItemCreated()
            onClose()
        } catch (error) {
            console.error('Failed to save item:', error)
            try {
                if (uploadedPaths.length > 0) {
                    await Promise.all(uploadedPaths.map((p: string) => deleteStorageFile(p)))
                }
            } catch (cleanupErr) {
                console.error('Failed to cleanup uploaded files after item save failure:', cleanupErr)
            }
            alert('Failed to save item. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleTrimAudio = async () => {
        if (!audioBlob) return

        try {
            setIsTrimming(true)
            await new Promise(resolve => setTimeout(resolve, 100))
            const trimmedBlob = await trimSilence(audioBlob)

            if (trimmedBlob.size !== audioBlob.size) {
                if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
                const newUrl = URL.createObjectURL(trimmedBlob)
                setAudioBlob(trimmedBlob)
                setAudioPreviewUrl(newUrl)
            }
        } catch (error) {
            console.error('Failed to trim audio:', error)
            alert('Could not trim audio. Please try again.')
        } finally {
            setIsTrimming(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editMode ? 'Edit Item' : 'Add New Item'}
            description={`Form to ${editMode ? 'edit' : 'create'} an item`}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Item Name with Emoji Button */}
                <FormField
                    label="Item Name"
                    htmlFor="name"
                    error={errors.name?.message}
                >
                    <div className="flex gap-2">
                        <Input
                            id="name"
                            type="text"
                            placeholder="e.g., Vintage Lamp"
                            error={!!errors.name}
                            {...register('name')}
                            className="flex-1"
                        />
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(true)}
                            className="w-12 h-12 flex items-center justify-center bg-bg-surface hover:bg-bg-elevated rounded-xl border border-border-light transition-colors shrink-0"
                            title="Choose icon"
                        >
                            <IconOrEmoji
                                iconValue={selectedEmoji}
                                defaultIcon={getItemIcon()}
                                color={DEFAULT_ITEM_COLOR}
                                size="sm"
                            />
                        </button>
                    </div>
                </FormField>

                {/* Emoji Picker Modal */}
                {showEmojiPicker && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => setShowEmojiPicker(false)}>
                        <div onClick={(e) => e.stopPropagation()}>
                            <EmojiPicker
                                selectedEmoji={selectedEmoji}
                                onEmojiSelect={(emoji) => {
                                    setSelectedEmoji(emoji)
                                    setShowEmojiPicker(false)
                                }}
                                onClose={() => setShowEmojiPicker(false)}
                            />
                        </div>
                    </div>
                )}

                <FormField
                    label="Description (Optional)"
                    htmlFor="description"
                >
                    <Textarea
                        id="description"
                        rows={3}
                        placeholder="Details about the item..."
                        {...register('description')}
                    />
                </FormField>

                {/* Toggle Row for Metadata Sections */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setShowGroupSection(!showGroupSection)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${showGroupSection
                            ? 'bg-accent-blue text-white'
                            : 'bg-bg-surface text-text-secondary border border-border-light hover:bg-bg-elevated'
                            }`}
                    >
                        <Folder size={16} />
                        Add to Group
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPhotosSection(!showPhotosSection)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${showPhotosSection
                            ? 'bg-accent-blue text-white'
                            : 'bg-bg-surface text-text-secondary border border-border-light hover:bg-bg-elevated'
                            }`}
                    >
                        <Camera size={16} />
                        Add Photos
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowVoiceNotesSection(!showVoiceNotesSection)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${showVoiceNotesSection
                            ? 'bg-accent-blue text-white'
                            : 'bg-bg-surface text-text-secondary border border-border-light hover:bg-bg-elevated'
                            }`}
                    >
                        <Mic size={16} />
                        Add Voice Notes
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowQuantitySection(!showQuantitySection)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${showQuantitySection
                            ? 'bg-accent-blue text-white'
                            : 'bg-bg-surface text-text-secondary border border-border-light hover:bg-bg-elevated'
                            }`}
                    >
                        <Hash size={16} />
                        Add Quantity
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowTagsSection(!showTagsSection)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${showTagsSection
                            ? 'bg-accent-blue text-white'
                            : 'bg-bg-surface text-text-secondary border border-border-light hover:bg-bg-elevated'
                            }`}
                    >
                        <Tag size={16} />
                        Add Tags
                    </button>
                </div>


                {/* Conditionally Rendered Sections */}
                {showGroupSection && (
                    <FormField
                        label="Item Group (Optional)"
                        htmlFor="groupId"
                        error={errors.groupId?.message}
                    >
                        <Select
                            id="groupId"
                            error={!!errors.groupId}
                            {...register('groupId')}
                        >
                            <option value="">None (Top Level)</option>
                            {itemGroups.map(group => (
                                <option key={group.id} value={group.id}>
                                    {group.name}
                                </option>
                            ))}
                        </Select>
                    </FormField>
                )}

                {showPhotosSection && (
                    <FormField label="Photos">
                        <MultiImageUploader
                            value={images}
                            onChange={setImages}
                            label="Photos"
                        />
                        {isCompressing && (
                            <ProgressBar
                                progress={progress}
                                label="Compressing images..."
                                className="mt-3"
                            />
                        )}
                    </FormField>
                )}

                {showVoiceNotesSection && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label className="mb-0">Voice Note (Optional)</Label>
                            {!showAudioRecorder && !audioBlob && !existingAudioUrl && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={Mic}
                                    onClick={() => setShowAudioRecorder(true)}
                                >
                                    Add Voice Note
                                </Button>
                            )}
                        </div>

                        {showAudioRecorder && !audioBlob && (
                            <AudioRecorder
                                onRecordingComplete={(blob) => {
                                    setAudioBlob(blob)
                                    const url = URL.createObjectURL(blob)
                                    setAudioPreviewUrl(url)
                                    setShowAudioRecorder(false)
                                    setExistingAudioUrl(null)
                                }}
                                maxDuration={60}
                            />
                        )}

                        {(audioBlob && audioPreviewUrl) || existingAudioUrl ? (
                            <div className="space-y-2">
                                <div className="relative">
                                    <AudioPlayer
                                        audioUrl={(audioBlob && audioPreviewUrl) ? audioPreviewUrl : existingAudioUrl!}
                                        className="border border-border-light"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (audioBlob) {
                                                setAudioBlob(null)
                                                if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
                                                setAudioPreviewUrl(null)
                                            } else {
                                                setExistingAudioUrl(null)
                                                setWasAudioDeleted(true)
                                            }
                                            setShowAudioRecorder(false)
                                        }}
                                        className="absolute -top-2 -right-2 w-7 h-7 bg-bg-elevated rounded-full shadow-sm flex items-center justify-center text-text-secondary hover:text-text-primary transition border border-border-light z-10"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                {audioBlob && !isTrimming && (
                                    <div className="flex justify-end">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleTrimAudio}
                                            className="text-xs h-7 px-2 text-text-secondary hover:text-accent-blue"
                                        >
                                            ✨ Trim Silence
                                        </Button>
                                    </div>
                                )}

                                {isTrimming && (
                                    <div className="flex items-center gap-2 text-xs text-text-secondary animate-pulse">
                                        <div className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" />
                                        Processing audio (client-side)...
                                    </div>
                                )}
                            </div>
                        ) : null}
                    </div>
                )}

                {showQuantitySection && (
                    <FormField
                        label="Quantity"
                        htmlFor="quantity"
                        error={errors.quantity?.message}
                    >
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    const currentQuantity = watch('quantity') ?? 1
                                    if (currentQuantity > 0) {
                                        setValue('quantity', currentQuantity - 1)
                                    }
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-bg-surface hover:bg-bg-elevated rounded-lg border border-border-light transition-colors shrink-0"
                                title="Decrease quantity"
                            >
                                <Minus size={18} />
                            </button>
                            <Input
                                id="quantity"
                                type="number"
                                min="0"
                                placeholder="1"
                                error={!!errors.quantity}
                                {...register('quantity', { valueAsNumber: true })}
                                className="text-center"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    const currentQuantity = watch('quantity') ?? 1
                                    setValue('quantity', currentQuantity + 1)
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-bg-surface hover:bg-bg-elevated rounded-lg border border-border-light transition-colors shrink-0"
                                title="Increase quantity"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </FormField>
                )}

                {showTagsSection && (
                    <FormField label="Tags">
                        <TagInput
                            tags={tags}
                            onChange={setTags}
                            suggestions={tagSuggestions}
                            placeholder="Type a tag and press Enter..."
                        />
                    </FormField>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    {showBackButton && onBack && (
                        <Button type="button" variant="secondary" onClick={onBack}>
                            Back
                        </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        isLoading={isSubmitting || isCompressing}
                    >
                        {isSubmitting ? 'Saving...' : (editMode ? 'Save Changes' : 'Create Item')}
                    </Button>
                </div>
            </form>

            {/* Confirmation dialog for removing metadata */}
            <ConfirmDialog
                isOpen={showRemoveConfirm}
                onClose={() => {
                    setShowRemoveConfirm(false)
                    setPendingFormData(null)
                }}
                onConfirm={async () => {
                    setShowRemoveConfirm(false)
                    if (pendingFormData) {
                        await performSubmit(pendingFormData)
                        setPendingFormData(null)
                    }
                }}
                title="Remove Data"
                message={`Saving will remove the following: ${removedSectionNames.join(', ')}. Are you sure?`}
                confirmLabel="Save Anyway"
                cancelLabel="Go Back"
                variant="danger"
            />
        </Modal >
    )
}
