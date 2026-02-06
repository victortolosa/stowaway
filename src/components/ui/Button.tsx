import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-display font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 outline-none focus-visible:ring-2 focus-visible:ring-accent-aqua focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-text-primary text-bg-page shadow-lg shadow-black/10 hover:opacity-90 hover:shadow-black/20 border border-transparent',
        secondary: 'bg-bg-surface text-text-primary border border-border-standard shadow-sm hover:bg-bg-subtle hover:border-border-active',
        accent: 'bg-accent-aqua text-white shadow-lg shadow-accent-aqua/30 hover:bg-accent-aqua-dark hover:shadow-accent-aqua/40',
        danger: 'bg-accent-danger-bg text-accent-danger border border-accent-danger/10 hover:bg-accent-danger/10',
        ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-text-primary/5',
        icon: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-text-primary/5 rounded-full aspect-square p-0',
      },
      size: {
        sm: 'text-xs px-3 py-1.5 rounded-button gap-1.5 h-8',
        md: 'text-sm px-5 py-2.5 rounded-button gap-2 h-11', // Mobile standard touch target
        lg: 'text-base px-6 py-3.5 rounded-button gap-2.5 h-14', // Premium, chunky size
        icon: 'h-10 w-10 p-0',
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
