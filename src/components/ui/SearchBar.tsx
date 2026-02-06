import { Search } from 'lucide-react'

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function SearchBar({ value, onChange, placeholder = 'Search...', className }: SearchBarProps) {
    return (
        <div className={`bg-bg-surface rounded-xl h-[52px] px-4 flex items-center gap-3 shadow-sm border border-border-standard focus-within:border-accent-aqua focus-within:shadow-md transition-all duration-200 w-full ${className || ''}`}>
            <Search size={22} className="text-accent-aqua" strokeWidth={2.5} />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 min-w-0 font-body text-[16px] text-text-primary placeholder:text-text-tertiary outline-none bg-transparent"
            />
        </div>
    )
}
