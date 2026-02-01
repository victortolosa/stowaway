import { useState, useRef, useEffect } from 'react'
import { useReactMediaRecorder } from 'react-media-recorder'
import { Mic, Square, Play, Pause, X, AlertCircle, Loader2 } from 'lucide-react'

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void
    maxDuration?: number // in seconds
}

/**
 * Audio recording component with preview playback
 * Records audio/webm with opus codec for efficiency
 */
export function AudioRecorder({
    onRecordingComplete,
    maxDuration = 60
}: AudioRecorderProps) {
    const [isPlaying, setIsPlaying] = useState(false)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const timeoutRef = useRef<number | null>(null)
    const stoppedRef = useRef(false)

    // Check for secure context and media device support
    const [isSecureContext] = useState(() => typeof window !== 'undefined' ? window.isSecureContext : true)
    const [hasMediaDevices] = useState(() => typeof window !== 'undefined' ? !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) : true)
    const [availableMics, setAvailableMics] = useState<MediaDeviceInfo[]>([])
    const [isStandalone] = useState(() => {
        if (typeof window === 'undefined') return false
        const standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        return Boolean(standalone || (navigator as any).standalone)
    })
    const [isIOS] = useState(() => {
        if (typeof navigator === 'undefined') return false
        return /iP(ad|hone|od)/.test(navigator.userAgent)
    })

    useEffect(() => {
        // Check for available devices
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices()
                .then((devices: MediaDeviceInfo[]) => {
                    const mics = devices.filter(d => d.kind === 'audioinput')
                    setAvailableMics(mics)
                    console.log("Available microphones:", mics)
                })
                .catch((err: any) => console.error("Error enumerating devices:", err))
        }
    }, [])

    const {
        status,
        startRecording: baseStartRecording,
        stopRecording: baseStopRecording,
        mediaBlobUrl,
        error: recorderError,
        clearBlobUrl
    } = useReactMediaRecorder({
        audio: true, // Most basic constraint
        onStop: (blobUrl, blob) => {
            if (!blobUrl || !blob) return
            if (stoppedRef.current) return
            stoppedRef.current = true

            // Create audio element for preview
            const audio = new Audio(blobUrl)
            audio.onended = () => setIsPlaying(false)
            audioRef.current = audio
            onRecordingComplete(blob)

            // Clear timeout if it exists
            if (timeoutRef.current) {
                window.clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
        }
    })

    const startRecording = async () => {
        try {
            // Clear any existing state
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.onended = null
                audioRef.current.src = ''
                audioRef.current = null
            }
            setIsPlaying(false)
            clearBlobUrl()
            stoppedRef.current = false

            // Preflight getUserMedia to ensure permission prompt appears in a predictable way
            if (navigator.mediaDevices) {
                try {
                    // request and immediately stop to trigger permissions UI where needed
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pre = (navigator.mediaDevices as any).getUserMedia({ audio: true })
                    // Wait briefly for the promise to resolve/reject before proceeding
                    await Promise.race([pre, new Promise(res => setTimeout(res, 250))])
                    // if we got a stream, stop tracks (safe if it's not a stream)
                    pre.then((s: MediaStream) => s.getTracks().forEach((t: MediaStreamTrack) => t.stop())).catch(() => { })
                } catch (err) {
                    console.debug('Microphone preflight failed or was denied, proceeding to recorder start:', err)
                }
            }

            // Start recording
            baseStartRecording()

            // Setup auto-stop timeout
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
            timeoutRef.current = window.setTimeout(() => {
                baseStopRecording()
            }, maxDuration * 1000)
        } catch (err: any) {
            console.error("Failed to start recording:", err)
        }
    }

    const stopRecording = () => {
        stoppedRef.current = true
        baseStopRecording()
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }

    // Stop recording when the document becomes hidden (PWAs may background/suspend)
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

    const togglePlayPreview = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
        } else {
            audio.play()
                .then(() => setIsPlaying(true))
                .catch((err: any) => {
                    console.error('Playback failed:', err)
                    setIsPlaying(false)
                })
        }
    }

    const clearRecording = () => {
        if (audioRef.current) {
            audioRef.current.pause()
            audioRef.current.onended = null
            try { if (mediaBlobUrl) URL.revokeObjectURL(mediaBlobUrl) } catch {
                /* ignore */
            }
            audioRef.current.src = ''
            audioRef.current = null
        }
        setIsPlaying(false)
        clearBlobUrl()
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.onended = null
                audioRef.current.src = ''
                audioRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        if (recorderError) {
            console.error("Media Recorder Error:", recorderError)
        }
    }, [recorderError])

    // Render helpers
    const isLoading = status === 'acquiring_media'
    const isRecording = status === 'recording'
    const hasError = !!recorderError || !isSecureContext || !hasMediaDevices

    const getErrorMessage = (err: unknown) => {
        if (!isSecureContext) return 'Microphone requires a secure connection (HTTPS).'
        const code = typeof err === 'string' ? err : (err && (err as any).name) || String(err || 'unknown')

        if (!hasMediaDevices) return 'Recording is not supported in this browser or environment.'

        // Add PWA-specific hint for iOS PWAs
        const pwaHint = isStandalone && isIOS
            ? ' Note: iOS PWAs may suspend when backgrounded; recording can stop when the app is backgrounded.'
            : ''

        switch (code) {
            case 'permission_denied':
                return 'Microphone access denied. Please check site permissions.' + pwaHint
            case 'no_constraints':
                return availableMics.length === 0
                    ? 'No microphone detected. Please connect one and try again.'
                    : 'Could not connect to microphone. Ensure it is not being used by another app.'
            case 'no_mic':
                return 'No microphone detected.'
            case 'not_supported':
            case 'no_media_recorder':
                return 'Recording not supported in this browser.'
            default:
                return `Recording error (${code}). Please try again.` + pwaHint
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
                                {getErrorMessage(recorderError)}
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
