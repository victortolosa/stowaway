import { useRef, useState, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'

interface AudioPlayerProps {
    audioUrl: string
    className?: string
}

/**
 * Custom audio player with play/pause controls and progress bar
 */
export function AudioPlayer({ audioUrl, className = '' }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [hasError, setHasError] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const [prevAudioUrl, setPrevAudioUrl] = useState(audioUrl)

    // Reset UI when source changes
    if (audioUrl !== prevAudioUrl) {
        setPrevAudioUrl(audioUrl)
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)
        setHasError(false)
        setErrorMessage(null)
    }

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        console.log('AudioPlayer: Loading audio from URL:', audioUrl)

        // Try to force speaker output on iOS by setting audio category
        // This is a workaround attempt for iOS routing audio to earpiece
        try {
            // @ts-expect-error - iOS-specific API that might not be in types
            if (audio.webkitAudioContext || window.webkitAudioContext) {
                console.log('AudioPlayer: Attempting to set audio output to speaker')
            }
        } catch (err) {
            console.log('AudioPlayer: Could not set speaker output:', err)
        }

        const updateTime = () => setCurrentTime(audio.currentTime)
        const updateDuration = () => {
            const dur = Number.isFinite(audio.duration) ? audio.duration : 0
            console.log('AudioPlayer: Duration loaded:', dur)
            setDuration(dur)
        }
        const handleEnded = () => setIsPlaying(false)
        const handleError = (_: Event) => {
            console.error('AudioPlayer: Audio element error:', {
                error: audio.error,
                errorCode: audio.error?.code,
                errorMessage: audio.error?.message,
                src: audio.src,
                readyState: audio.readyState,
                networkState: audio.networkState
            })

            setHasError(true)

            // Provide specific error messages based on error code
            if (audio.error) {
                switch (audio.error.code) {
                    case 1: // MEDIA_ERR_ABORTED
                        setErrorMessage('Playback aborted')
                        break
                    case 2: // MEDIA_ERR_NETWORK
                        setErrorMessage('Network error - check connection')
                        break
                    case 3: // MEDIA_ERR_DECODE
                        setErrorMessage('Audio decode failed')
                        break
                    case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                        // This usually happens with CORS issues or 404s
                        setErrorMessage('Playback not supported or file inaccessible')
                        break
                    default:
                        setErrorMessage('Playback failed')
                }
            } else {
                setErrorMessage('Unable to play audio')
            }

            setIsPlaying(false)
        }

        const handleCanPlay = () => {
            console.log('AudioPlayer: Audio can play', {
                duration: audio.duration,
                volume: audio.volume,
                muted: audio.muted
            })
            setHasError(false)
        }

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('loadedmetadata', updateDuration)
        audio.addEventListener('ended', handleEnded)
        audio.addEventListener('error', handleError)
        audio.addEventListener('canplay', handleCanPlay)

        // Ensure audio is not muted and volume is at max
        audio.muted = false
        audio.volume = 1.0

        try {
            audio.load()
            console.log('AudioPlayer: load() called, volume:', audio.volume, 'muted:', audio.muted)
        } catch (err) {
            console.error('AudioPlayer: load() failed:', err)
        }

        return () => {
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('loadedmetadata', updateDuration)
            audio.removeEventListener('ended', handleEnded)
            audio.removeEventListener('error', handleError)
            audio.removeEventListener('canplay', handleCanPlay)
        }
    }, [audioUrl])

    const togglePlayPause = () => {
        const audio = audioRef.current
        if (!audio) return

        if (hasError) {
            // If there's an error, try reloading first
            audio.load()
            setHasError(false)
            // Don't return, let it try to play
        }

        if (isPlaying) {
            audio.pause()
            setIsPlaying(false)
        } else {
            console.log('AudioPlayer: Attempting to play', {
                src: audio.src,
                readyState: audio.readyState,
                duration: audio.duration,
                networkState: audio.networkState
            })

            const playPromise = audio.play()

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('AudioPlayer: Playback started successfully')
                        setIsPlaying(true)
                        setHasError(false)
                        // Log after a moment to see if time is progressing
                        setTimeout(() => {
                            console.log('AudioPlayer: Playback check', {
                                currentTime: audio.currentTime,
                                duration: audio.duration,
                                paused: audio.paused,
                                volume: audio.volume,
                                muted: audio.muted
                            })
                        }, 500)
                    })
                    .catch((err) => {
                        console.error('AudioPlayer: Playback failed', {
                            error: err,
                            name: err.name,
                            message: err.message,
                            src: audio.src,
                            readyState: audio.readyState,
                            audioElementError: audio.error
                        })
                        setIsPlaying(false)
                        setHasError(true)
                        setErrorMessage(err.message || 'Playback failed')
                    })
            }
        }
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current
        if (!audio) return

        let newTime = Number(e.target.value)
        if (Number.isNaN(newTime) || newTime < 0) newTime = 0
        if (duration && newTime > duration) newTime = duration
        audio.currentTime = newTime
        setCurrentTime(newTime)
    }

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00'
        const minutes = Math.floor(time / 60)
        const seconds = Math.floor(time % 60)
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    // Detect iOS for special handling
    const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent)

    return (
        <div className={`bg-bg-surface rounded-button p-4 ${className}`}>
            {isIOS ? (
                // Use video element on iOS for better speaker routing
                <video
                    ref={audioRef as any}
                    src={audioUrl}
                    preload="metadata"
                    playsInline
                    webkit-playsinline="true"
                    muted={false}
                    controls={false}
                    autoPlay={false}
                    style={{
                        display: 'none',
                        position: 'absolute',
                        width: '1px',
                        height: '1px',
                        opacity: 0,
                        pointerEvents: 'none'
                    }}
                />
            ) : (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    preload="metadata"
                    playsInline
                    controls={false}
                    style={{ display: 'none' }}
                    crossOrigin="anonymous" // Add anonymous access for CORS
                />
            )}

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    {/* Play/Pause Button */}
                    <button
                        type="button"
                        onClick={togglePlayPause}
                        className={`w-10 h-10 ${hasError ? 'bg-red-500' : 'bg-accent-aqua'} rounded-full flex items-center justify-center text-white active:opacity-90 transition flex-shrink-0`}
                    >
                        {hasError ? (
                            <Pause size={16} fill="white" className="rotate-45" /> // X icon
                        ) : isPlaying ? (
                            <Pause size={16} fill="white" />
                        ) : (
                            <Play size={16} fill="white" className="ml-0.5" />
                        )}
                    </button>

                    {/* Progress Bar */}
                    <div className="flex-1">
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            disabled={hasError}
                            className="w-full h-1.5 bg-bg-elevated rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-aqua disabled:opacity-50"
                            style={{
                                background: `linear-gradient(to right, var(--color-accent-aqua) 0%, var(--color-accent-aqua) ${progress}%, var(--color-bg-elevated) ${progress}%, var(--color-bg-elevated) 100%)`
                            }}
                        />

                        {/* Time Display */}
                        <div className="flex justify-between mt-1">
                            <span className="font-body text-[11px] text-text-tertiary">
                                {formatTime(currentTime)}
                            </span>
                            <span className="font-body text-[11px] text-text-tertiary">
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Error Fallback */}
                {hasError && (
                    <div className="mt-1 flex items-start gap-2 text-xs text-red-500 bg-red-50 p-2 rounded-md border border-red-100">
                        <div className="flex-1">
                            <p className="font-medium">{errorMessage || 'Playback failed'}</p>
                            <a
                                href={audioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline mt-0.5 inline-block text-red-600 font-semibold"
                            >
                                Download / Open in New Tab
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
