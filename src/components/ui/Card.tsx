import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva('transition-all duration-200', {
  variants: {
    variant: {
      default: 'bg-bg-surface rounded-card border border-border-light shadow-card',
      elevated: 'bg-bg-elevated rounded-card shadow-lg border border-white/50',
      interactive: 'bg-bg-surface rounded-card border border-border-light shadow-card cursor-pointer hover:shadow-card-hover hover:border-accent-aqua/50 active:scale-[0.99]',
      flat: 'bg-bg-surface-alt rounded-card border border-transparent',
      outlined: 'bg-transparent rounded-card border border-border-standard',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
  },
  defaultVariants: {
    variant: 'default',
    padding: 'md',
  },
})

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> { }

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding }), className)}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'
