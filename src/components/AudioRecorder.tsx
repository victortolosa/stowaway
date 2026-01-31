import { useState, useRef, useEffect } from 'react'
import { ReactMediaRecorder } from 'react-media-recorder'
import { Mic, Square, Play, Pause, X } from 'lucide-react'

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
    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
    const timeoutRef = useRef<number | null>(null)

    const handleStop = (blobUrl: string, blob: Blob) => {
        // Create audio element for preview
        const audio = new Audio(blobUrl)
        audio.addEventListener('ended', () => setIsPlaying(false))
        setAudioElement(audio)
        onRecordingComplete(blob)

        // Clear timeout if it exists
        if (timeoutRef.current) {
            window.clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }

    const togglePlayPreview = () => {
        if (!audioElement) return

        if (isPlaying) {
            audioElement.pause()
            setIsPlaying(false)
        } else {
            audioElement.play()
            setIsPlaying(true)
        }
    }

    const clearRecording = () => {
        if (audioElement) {
            audioElement.pause()
            audioElement.src = ''
        }
        setAudioElement(null)
        setIsPlaying(false)
    }

    // Auto-stop handler
    const onStart = (stopFunc: () => void) => {
        timeoutRef.current = window.setTimeout(() => {
            stopFunc()
        }, maxDuration * 1000)
    }

    useEffect(() => {
        return () => {
            if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
            if (audioElement) {
                audioElement.pause()
                audioElement.src = ''
            }
        }
    }, [audioElement])

    return (
        <ReactMediaRecorder
            audio
            onStop={handleStop}
            render={({ status, startRecording, stopRecording, mediaBlobUrl }) => {
                const wrappedStart = () => {
                    onStart(stopRecording)
                    startRecording()
                }

                return (
                    <div className="space-y-3">
                        {/* Recording Controls */}
                        {!mediaBlobUrl ? (
                            <div className="flex items-center gap-3">
                                {status === 'recording' ? (
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
                                            onClick={wrappedStart}
                                            className="flex-1 h-12 bg-accent-pink rounded-button flex items-center justify-center gap-2 text-white font-medium active:opacity-90 transition"
                                        >
                                            <Mic size={18} />
                                            Start Recording
                                        </button>

                                        <span className="font-body text-[12px] text-text-tertiary whitespace-nowrap">
                                            Max {maxDuration}s
                                        </span>
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Preview Controls */}
                                <div className="bg-bg-surface rounded-button p-4 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={togglePlayPreview}
                                        className="w-10 h-10 bg-accent-pink rounded-full flex items-center justify-center text-white active:opacity-90 transition"
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
                        {status === 'recording' && (
                            <p className="font-body text-[12px] text-text-tertiary text-center">
                                Recording will automatically stop after {maxDuration} seconds
                            </p>
                        )}
                    </div>
                )
            }}
        />
    )
}
