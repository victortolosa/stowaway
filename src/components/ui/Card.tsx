import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva('transition-all duration-200', {
  variants: {
    variant: {
      default: 'bg-bg-surface rounded-card border border-black/5 shadow-card hover:shadow-md hover:border-black/10',
      elevated: 'bg-white rounded-card shadow-lg border border-white/50',
      interactive: 'bg-bg-surface rounded-card border border-black/5 shadow-card cursor-pointer hover:scale-[1.02] active:scale-[0.98] active:opacity-90',
    },
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4', // Increased padding slightly for breathability
      lg: 'p-5',
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
