import { forwardRef } from 'react'

interface SwitchProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    className?: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
    ({ checked, onCheckedChange, disabled = false, className = '' }, ref) => {
        return (
            <button
                ref={ref}
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onCheckedChange(!checked)}
                className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-accent-aqua focus:ring-offset-2
          ${checked ? 'bg-accent-aqua' : 'bg-border-light'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
            >
                <span
                    className={`
            inline-block h-4 w-4 transform rounded-full bg-white
            transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
                />
            </button>
        )
    }
)

Switch.displayName = 'Switch'
