import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence } from 'framer-motion'
import { Mic, X } from 'lucide-react'
import { createItem, updateItem, uploadImage, uploadAudio, deleteStorageFile } from '@/services/firebaseService'
import { deleteField } from 'firebase/firestore'
import { useAuthStore } from '@/store/auth'
import { useImageCompression } from '@/hooks'
import { ImageCropper, AudioRecorder, AudioPlayer } from '@/components'
import { trimSilence } from '@/utils/audioUtils'
import { Item } from '@/types'
import { Modal, Button, Input, Textarea, FormField, Label, ImageUploader, ProgressBar } from '@/components/ui'

const itemSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
})

type ItemFormValues = z.infer<typeof itemSchema>

interface CreateItemModalProps {
    isOpen: boolean
    onClose: () => void
    onItemCreated: () => void
    containerId: string
    editMode?: boolean
    initialData?: Item
}

export function CreateItemModal({
    isOpen,
    onClose,
    onItemCreated,
    containerId,
    editMode = false,
    initialData
}: CreateItemModalProps) {
    const user = useAuthStore((state) => state.user)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [showCropper, setShowCropper] = useState(false)
    const [imageToCrop, setImageToCrop] = useState<string | null>(null)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
    const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null)
    const [wasAudioDeleted, setWasAudioDeleted] = useState(false)
    const [showAudioRecorder, setShowAudioRecorder] = useState(false)
    const [isTrimming, setIsTrimming] = useState(false)

    const { compress, isCompressing, progress } = useImageCompression()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ItemFormValues>({
        resolver: zodResolver(itemSchema),
    })

    useEffect(() => {
        if (isOpen && editMode && initialData) {
            reset({
                name: initialData.name,
                description: initialData.description || '',
            })
            setPhotoFile(null)
            setPhotoPreview(initialData.photos[0] || null)
            setAudioBlob(null)
            setExistingAudioUrl(initialData.voiceNoteUrl || null)
            setWasAudioDeleted(false)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
        } else if (isOpen && !editMode) {
            reset({
                name: '',
                description: '',
            })
            setPhotoFile(null)
            setPhotoPreview(null)
            setAudioBlob(null)
            setExistingAudioUrl(null)
            setWasAudioDeleted(false)
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
            setAudioPreviewUrl(null)
            setShowAudioRecorder(false)
        }
    }, [isOpen, editMode, initialData, reset, audioPreviewUrl])

    useEffect(() => {
        return () => {
            if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
        }
    }, [isOpen, editMode, initialData, reset, audioPreviewUrl])

    const onSubmit = async (data: ItemFormValues) => {
        if (!user) return

        setIsSubmitting(true)
        const uploadedPaths: string[] = []
        try {
            let photoUrl = ''
            let audioUrl = ''

            if (photoFile) {
                const compressedPhoto = await compress(photoFile, {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                })

                const ext = compressedPhoto.type.split('/')[1] || 'jpg'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const photoPath = `items/${user.uid}/${filename}`
                photoUrl = await uploadImage(compressedPhoto, photoPath)
                uploadedPaths.push(photoPath)
            }

            if (audioBlob) {
                const ext = (audioBlob.type && audioBlob.type.split('/')[1]) || 'webm'
                const filename = `${Date.now()}_${(crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))}.${ext}`
                const audioFile = new File([audioBlob], filename, {
                    type: audioBlob.type || 'audio/webm',
                })
                const audioPath = `items/${user.uid}/audio/${filename}`
                audioUrl = await uploadAudio(audioFile, audioPath)
                uploadedPaths.push(audioPath)
            }

            const itemData = {
                ...data,
                ...(photoUrl && { photos: [photoUrl] }),
                ...(audioUrl && { voiceNoteUrl: audioUrl }),
            }

            if (editMode && initialData) {
                const updatePayload: Partial<Item> & { voiceNoteUrl?: ReturnType<typeof deleteField> } = {
                    ...itemData,
                    photos: photoUrl ? [photoUrl] : initialData.photos,
                }

                if (wasAudioDeleted && !audioUrl) {
                    updatePayload.voiceNoteUrl = deleteField()
                } else if (audioUrl) {
                    updatePayload.voiceNoteUrl = audioUrl
                }

                await updateItem(initialData.id, updatePayload)
            } else {
                await createItem({
                    name: itemData.name,
                    description: itemData.description,
                    containerId,
                    photos: photoUrl ? [photoUrl] : [],
                    tags: [],
                    voiceNoteUrl: audioUrl,
                })
            }

            reset()
            setPhotoFile(null)
            setPhotoPreview(null)
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            const reader = new FileReader()

            reader.onload = () => {
                setImageToCrop(reader.result as string)
                setShowCropper(true)
            }

            reader.readAsDataURL(file)
        }
    }

    const handleCropComplete = async (croppedBlob: Blob) => {
        const file = new File([croppedBlob], `cropped_${Date.now()}.jpg`, {
            type: 'image/jpeg',
        })

        setPhotoFile(file)

        const previewUrl = URL.createObjectURL(croppedBlob)
        setPhotoPreview(previewUrl)

        setShowCropper(false)
        setImageToCrop(null)
    }

    const handleCropCancel = () => {
        setShowCropper(false)
        setImageToCrop(null)
    }

    const removePhoto = () => {
        setPhotoFile(null)
        setPhotoPreview(null)
    }

    const handleTrimAudio = async () => {
        if (!audioBlob) return

        try {
            setIsTrimming(true)
            // Small delay to let UI render the loading state
            await new Promise(resolve => setTimeout(resolve, 100))

            const trimmedBlob = await trimSilence(audioBlob)

            // Check if size changed significantly to warn/inform? 
            // For now just update it.
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
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={editMode ? 'Edit Item' : 'Add New Item'}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                        label="Item Name"
                        htmlFor="name"
                        error={errors.name?.message}
                    >
                        <Input
                            id="name"
                            type="text"
                            placeholder="e.g., Vintage Lamp"
                            error={!!errors.name}
                            {...register('name')}
                        />
                    </FormField>

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

                    <FormField label="Photo">
                        <ImageUploader
                            preview={photoPreview}
                            onFileSelect={handleFileChange}
                            onRemove={removePhoto}
                            label="Photo"
                        />
                        {isCompressing && (
                            <ProgressBar
                                progress={progress}
                                label="Compressing image..."
                                className="mt-3"
                            />
                        )}
                    </FormField>

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
                                    console.log('CreateItemModal: onRecordingComplete', { size: blob.size, type: blob.type })
                                    setAudioBlob(blob)
                                    const url = URL.createObjectURL(blob)
                                    console.log('CreateItemModal: Created preview URL', url)
                                    setAudioPreviewUrl(url)
                                    setShowAudioRecorder(false)
                                    setExistingAudioUrl(null) // Clear existing if new one recorded
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

                    <div className="flex justify-end gap-3 pt-2">
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
            </Modal>

            <AnimatePresence>
                {showCropper && imageToCrop && (
                    <ImageCropper
                        imageSrc={imageToCrop}
                        onComplete={handleCropComplete}
                        onCancel={handleCropCancel}
                        aspectRatio={4 / 3}
                    />
                )}
            </AnimatePresence>
        </>
    )
}
