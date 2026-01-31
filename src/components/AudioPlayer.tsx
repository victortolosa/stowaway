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

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const updateTime = () => setCurrentTime(audio.currentTime)
        const updateDuration = () => setDuration(audio.duration)
        const handleEnded = () => setIsPlaying(false)

        audio.addEventListener('timeupdate', updateTime)
        audio.addEventListener('loadedmetadata', updateDuration)
        audio.addEventListener('ended', handleEnded)

        return () => {
            audio.removeEventListener('timeupdate', updateTime)
            audio.removeEventListener('loadedmetadata', updateDuration)
            audio.removeEventListener('ended', handleEnded)
        }
    }, [])

    const togglePlayPause = () => {
        const audio = audioRef.current
        if (!audio) return

        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current
        if (!audio) return

        const newTime = Number(e.target.value)
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

    return (
        <div className={`bg-bg-surface rounded-button p-4 ${className}`}>
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlayPause}
                    className="w-10 h-10 bg-accent-pink rounded-full flex items-center justify-center text-white active:opacity-90 transition flex-shrink-0"
                >
                    {isPlaying ? (
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
                        className="w-full h-1.5 bg-bg-elevated rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-pink"
                        style={{
                            background: `linear-gradient(to right, var(--color-accent-pink) 0%, var(--color-accent-pink) ${progress}%, var(--color-bg-elevated) ${progress}%, var(--color-bg-elevated) 100%)`
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
        </div>
    )
}
