import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-display font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-br from-accent-aqua to-accent-aqua-dark text-white shadow-lg shadow-accent-aqua/30 hover:shadow-accent-aqua/50 hover:brightness-110 border border-transparent',
        secondary: 'bg-white text-text-primary border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300',
        danger: 'bg-accent-danger text-white shadow-md shadow-accent-danger/20 hover:bg-red-600',
        ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-black/5',
        icon: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-full',
      },
      size: {
        sm: 'text-[13px] px-3 py-1.5 rounded-button gap-1.5 min-h-[32px]',
        md: 'text-[15px] px-5 py-3 rounded-button gap-2 min-h-[44px]', // Mobile standard touch target
        lg: 'text-[17px] px-7 py-4 rounded-button gap-2.5 min-h-[56px]', // Premium, chunky size
        icon: 'p-3 rounded-full',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        ) : LeftIcon ? (
          <LeftIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        ) : null}
        {children}
        {RightIcon && !isLoading && (
          <RightIcon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
