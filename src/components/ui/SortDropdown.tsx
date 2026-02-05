import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { SortOption, getSortLabel } from '@/utils/sortUtils'
import { cn } from '@/lib/utils'

interface SortDropdownProps {
    value: SortOption
    onChange: (value: SortOption) => void
    options?: SortOption[]
    className?: string
}

const DEFAULT_OPTIONS: SortOption[] = [
    'recently-modified',
    'recently-added',
    'oldest-first',
    'a-z',
    'z-a'
]

export function SortDropdown({
    value,
    onChange,
    options = DEFAULT_OPTIONS,
    className
}: SortDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={cn("relative z-30", className)} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 font-body text-[11px] font-bold text-text-tertiary tracking-wider uppercase hover:text-text-secondary transition-colors"
            >
                {getSortLabel(value)}
                <ChevronDown size={12} className={cn("text-text-tertiary transition-transform", isOpen && "rotate-180")} strokeWidth={3} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl py-2 z-40 border border-border-standard backdrop-blur-md bg-opacity-95 animate-in fade-in slide-in-from-top-2 duration-200">
                    {options.map((option) => (
                        <button
                            key={option}
                            onClick={() => {
                                onChange(option)
                                setIsOpen(false)
                            }}
                            className={cn(
                                "w-full px-4 py-2 text-left font-body text-sm transition-colors",
                                value === option
                                    ? 'text-accent-aqua bg-accent-aqua/5 font-semibold'
                                    : 'text-text-primary hover:bg-bg-subtle'
                            )}
                        >
                            {getSortLabel(option)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
