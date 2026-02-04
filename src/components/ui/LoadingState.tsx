import { Loader2 } from 'lucide-react'

export interface LoadingStateProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center py-12'

  return (
    <div className={containerClass}>
      <div className="text-center flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-accent-aqua" size={32} />
        <p className="text-body-sm text-text-secondary font-medium">{message}</p>
      </div>
    </div>
  )
}
