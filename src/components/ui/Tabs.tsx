import { cn } from '@/lib/utils'
import { Fragment } from 'react'
import { Home } from 'lucide-react'

export interface TabItem {
    label: string
    value: string
    count?: number
}

interface TabsProps {
    tabs: TabItem[]
    activeTab: string
    onChange: (value: string) => void
    className?: string
    showHome?: boolean
    onHomeClick?: () => void
}

export function Tabs({ tabs, activeTab, onChange, className, showHome, onHomeClick }: TabsProps) {
    return (
        <div className={cn("flex items-center gap-2 w-full", className)}>
            {showHome && (
                <>
                    <button
                        onClick={onHomeClick}
                        className="flex items-center justify-center hover:text-text-primary transition-colors flex-shrink-0 p-1 text-text-tertiary hover:bg-bg-surface rounded-md relative select-none"
                        title="Dashboard"
                    >
                        <Home size={18} strokeWidth={2} />
                    </button>
                    <span className="text-text-quaternary/40 font-medium text-sm select-none" aria-hidden="true">/</span>
                </>
            )}
            {tabs.map((tab, index) => {
                const isActive = tab.value === activeTab
                return (
                    <Fragment key={tab.value}>
                        {index > 0 && (
                            <span className="text-text-quaternary/40 font-medium text-sm select-none" aria-hidden="true">/</span>
                        )}
                        <button
                            onClick={() => onChange(tab.value)}
                            className={cn(
                                "text-[10px] font-bold uppercase tracking-widest font-display transition-colors duration-200 select-none",
                                isActive
                                    ? "text-accent-aqua"
                                    : "text-text-tertiary hover:text-text-secondary"
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className="ml-1 opacity-60">
                                    ({tab.count})
                                </span>
                            )}
                        </button>
                    </Fragment>
                )
            })}
        </div>
    )
}

