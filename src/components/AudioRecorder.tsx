import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Play, Pause, X, AlertCircle, Loader2 } from 'lucide-react'

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void
    maxDuration?: number // in seconds
}

/**
 * Audio recording component with preview playback
 * Uses native MediaRecorder with timeslice for iOS stability
 */
export function AudioRecorder({
    onRecordingComplete,
    maxDuration = 60
}: AudioRecorderProps) {
    const [status, setStatus] = useState<'idle' | 'acquiring_media' | 'recording' | 'stopped'>('idle')
    const [isPlaying, setIsPlaying] = useState(false)
    const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const timeoutRef = useRef<number | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const streamRef = useRef<MediaStream | null>(null)

    // Check for secure context and media device support
    const [isSecureContext] = useState(() => typeof window !== 'undefined' ? window.isSecureContext : true)
    const [hasMediaDevices] = useState(() => typeof window !== 'undefined' ? !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) : true)
    const [isStandalone] = useState(() => {
        if (typeof window === 'undefined') return false
        const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        return Boolean(standalone || (navigator as any).standalone)
    })
    const [isIOS] = useState(() => {
        if (typeof navigator === 'undefined') return false
        return /iP(ad|hone|od)/.test(navigator.userAgent)
    })

    // Determine best audio format for cross-device compatibility
    const getAudioMimeType = () => {
        console.log('getAudioMimeType: Starting format detection...')

        // Detect iOS/Safari
        const isIOSorSafari = /iP(ad|hone|od)/.test(navigator.userAgent) ||
                              /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)

        console.log('Device detection:', { isIOSorSafari, userAgent: navigator.userAgent })

        if (!MediaRecorder || !MediaRecorder.isTypeSupported) {
            console.log('MediaRecorder.isTypeSupported not available, using default')
            return undefined
        }

        // For iOS/Safari, explicitly try formats in order of preference
        const types = isIOSorSafari ? [
            'audio/mp4',                    // iOS prefers MP4
            'audio/mp4;codecs=mp4a.40.2',  // MP4 with AAC-LC
        ] : [
            'audio/webm;codecs=opus',       // Chrome, Firefox prefer webm
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus'
        ]

        for (const type of types) {
            const supported = MediaRecorder.isTypeSupported(type)
            console.log(`Format "${type}" supported:`, supported)
            if (supported) {
                console.log('✓ Selected audio format:', type)
                return type
            }
        }

        console.log('⚠ No preferred format supported, using browser default')
        return undefined
    }

    const startRecording = async () => {
        try {
            setStatus('acquiring_media')
            setError(null)
            chunksRef.current = []

            // Get user media
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            // Determine mime type
            const mimeType = getAudioMimeType()

            // Create MediaRecorder with options
            const options: MediaRecorderOptions = {}
            if (mimeType) {
                options.mimeType = mimeType
            }

            const mediaRecorder = new MediaRecorder(stream, options)
            mediaRecorderRef.current = mediaRecorder

            console.log('MediaRecorder created with mimeType:', mediaRecorder.mimeType)

            // Handle data available - collect chunks
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data)
                    console.log('Audio chunk received, size:', e.data.size)
                }
            }

            // Handle stop - create blob and trigger callback
            mediaRecorder.onstop = () => {
                console.log('Recording stopped, total chunks:', chunksRef.current.length)

                if (chunksRef.current.length === 0) {
                    console.error('No audio data recorded')
                    setError('no_data')
                    setStatus('idle')
                    return
                }

                // Create blob from chunks with the recorder's mimeType
                const blob = new Blob(chunksRef.current, {
                    type: mediaRecorder.mimeType || 'audio/mp4'
                })

                console.log('Recording complete - blob size:', blob.size, 'type:', blob.type)

                // Create preview URL
                const blobUrl = URL.createObjectURL(blob)
                setMediaBlobUrl(blobUrl)

                // Create audio element for preview
                const audio = new Audio(blobUrl)
                audio.onended = () => setIsPlaying(false)
                audio.onerror = (e) => {
                    console.error('Audio preview playback error:', e, 'blob type:', blob.type)
                    setIsPlaying(false)
                }
                audioRef.current = audio

                // Trigger callback with blob
                onRecordingComplete(blob)

                // Stop all tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop())
                    streamRef.current = null
                }

                setStatus('stopped')
            }

            // Handle errors
            mediaRecorder.onerror = (e: Event) => {
                console.error('MediaRecorder error:', e)
                setError('recording_failed')
                setStatus('idle')
            }

            // Start recording with TIMESLICE for iOS stability
            // This is the key fix - chunking helps iOS handle recording better
            mediaRecorder.start(1000) // 1000ms timeslice
            setStatus('recording')
            console.log('Recording started with 1000ms timeslice')

            // Setup auto-stop timeout
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
            timeoutRef.current = window.setTimeout(() => {
                stopRecording()
            }, maxDuration * 1000)

        } catch (err: any) {
            console.error('Failed to start recording:', err)
            setError(err.name || 'permission_denied')
            setStatus('idle')
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop()
            console.log('Stopping recording...')
        }

        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }

    const togglePlayPreview = () => {
        const audio = audioRef.current
        if (!audio) {
            console.warn('No audio element available for preview')
            return
        }

        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
        } else {
            console.log('Attempting to play audio preview, src:', audio.src)
            audio.play()
                .then(() => {
                    console.log('Audio playback started successfully')
                    setIsPlaying(true)
                })
                .catch((err: any) => {
                    console.error('Audio playback failed:', err.name, err.message, 'src:', audio.src)
                    setIsPlaying(false)
                    alert(`Preview playback failed: ${err.message || err.name || 'Unknown error'}. The recording was saved successfully.`)
                })
        }
    }

    const clearRecording = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.onended = null
            try {
                if (mediaBlobUrl) {
                    URL.revokeObjectURL(mediaBlobUrl)
                }
            } catch {
                /* ignore */
            }
            audioRef.current.src = ''
            audioRef.current = null
        }
        setIsPlaying(false)
        setMediaBlobUrl(null)
        setStatus('idle')
    }

    // Stop recording when the document becomes hidden
    useEffect(() => {
        const handleVisibility = () => {
            try {
                if (document.hidden && status === 'recording') {
                    stopRecording()
                }
            } catch {
                /* ignore */
            }
        }

        document.addEventListener('visibilitychange', handleVisibility)
        return () => document.removeEventListener('visibilitychange', handleVisibility)
    }, [status])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.onended = null
                audioRef.current.src = ''
                audioRef.current = null
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop())
            }
            if (mediaBlobUrl) {
                try {
                    URL.revokeObjectURL(mediaBlobUrl)
                } catch {
                    /* ignore */
                }
            }
        }
    }, [])

    // Render helpers
    const isLoading = status === 'acquiring_media'
    const isRecording = status === 'recording'
    const hasError = !!error || !isSecureContext || !hasMediaDevices

    const getErrorMessage = (err: string | null) => {
        if (!isSecureContext) return 'Microphone requires a secure connection (HTTPS).'

        if (!hasMediaDevices) return 'Recording is not supported in this browser or environment.'

        // Add PWA-specific hint for iOS PWAs
        const pwaHint = isStandalone && isIOS
            ? ' Note: iOS PWAs may suspend when backgrounded; recording can stop when the app is backgrounded.'
            : ''

        switch (err) {
            case 'NotAllowedError':
            case 'permission_denied':
                return 'Microphone access denied. Please check site permissions.' + pwaHint
            case 'NotFoundError':
            case 'no_mic':
                return 'No microphone detected.'
            case 'NotSupportedError':
            case 'not_supported':
            case 'no_media_recorder':
                return 'Recording not supported in this browser.'
            case 'no_data':
                return 'No audio data was recorded. Please try again.'
            case 'recording_failed':
                return 'Recording failed. Please try again.'
            default:
                return err ? `Recording error (${err}). Please try again.` + pwaHint : ''
        }
    }

    // Safety check for browser support
    if (typeof MediaRecorder === 'undefined' && !isLoading) {
        return (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-button text-red-600 border border-red-100">
                <AlertCircle size={14} />
                <span className="font-body text-[12px]">
                    {getErrorMessage('no_media_recorder')}
                </span>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Recording Controls */}
            {!mediaBlobUrl ? (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        {isRecording ? (
                            <>
                                {/* Recording in progress */}
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="flex-1 h-12 bg-red-500 rounded-button flex items-center justify-center gap-2 text-white font-medium active:opacity-90 transition"
                                >
                                    <Square size={18} fill="white" />
                                    Stop Recording
                                </button>

                                {/* Pulsing red dot indicator */}
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    <span className="font-body text-[13px] text-text-secondary">
                                        Recording...
                                    </span>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Start recording button */}
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    disabled={isLoading}
                                    className="flex-1 h-12 bg-accent-aqua rounded-button flex items-center justify-center gap-2 text-white font-medium active:opacity-90 transition disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Initializing...
                                        </>
                                    ) : (
                                        <>
                                            <Mic size={18} />
                                            Start Recording
                                        </>
                                    )}
                                </button>

                                <span className="font-body text-[12px] text-text-tertiary whitespace-nowrap">
                                    Max {maxDuration}s
                                </span>
                            </>
                        )}
                    </div>

                    {/* Error Display */}
                    {hasError && (
                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-button text-red-600 border border-red-100">
                            <AlertCircle size={14} />
                            <span className="font-body text-[12px]">
                                {getErrorMessage(error)}
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Preview Controls */}
                    <div className="bg-bg-surface rounded-button p-4 flex items-center gap-3 border border-border-light">
                        <button
                            type="button"
                            onClick={togglePlayPreview}
                            className="w-10 h-10 bg-accent-aqua rounded-full flex items-center justify-center text-white active:opacity-90 transition"
                        >
                            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
                        </button>

                        <div className="flex-1">
                            <p className="font-body text-[14px] font-medium text-text-primary">
                                Voice Note Recorded
                            </p>
                            <p className="font-body text-[12px] text-text-secondary">
                                Tap play to preview
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={clearRecording}
                            className="w-8 h-8 bg-bg-elevated rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary transition"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </>
            )}

            {/* Auto-stop timer warning */}
            {isRecording && (
                <p className="font-body text-[12px] text-text-tertiary text-center">
                    Recording will automatically stop after {maxDuration} seconds
                </p>
            )}
        </div>
    )
}
