import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface NavigationHeaderProps {
    title?: string
    backTo?: string
    onBack?: () => void
    actions?: React.ReactNode
    className?: string
    transparent?: boolean
}

export function NavigationHeader({
    title,
    backTo,
    onBack,
    actions,
    className,
    transparent = false
}: NavigationHeaderProps) {
    const navigate = useNavigate()

    const handleBack = () => {
        if (onBack) {
            onBack()
        } else if (backTo) {
            navigate(backTo)
        } else {
            navigate(-1)
        }
    }

    return (
        <div className={cn(
            "flex items-center justify-between py-4 min-h-[60px]",
            transparent ? "bg-transparent" : "",
            className
        )}>
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                    onClick={handleBack}
                    className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full transition-colors flex-shrink-0",
                        transparent
                            ? "bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm"
                            : "hover:bg-bg-surface text-text-primary"
                    )}
                    aria-label="Go back"
                >
                    <ArrowLeft size={24} strokeWidth={2} />
                </button>

                {title && (
                    <h1 className={cn(
                        "font-display font-bold text-lg truncate",
                        transparent ? "text-white" : "text-text-primary"
                    )}>
                        {title}
                    </h1>
                )}
            </div>

            {actions && (
                <div className="flex items-center gap-2 pl-4 flex-shrink-0">
                    {actions}
                </div>
            )}
        </div>
    )
}
