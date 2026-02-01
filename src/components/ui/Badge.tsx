import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center font-body font-medium rounded-pill',
  {
    variants: {
      variant: {
        default: 'bg-bg-surface text-text-secondary',
        primary: 'bg-accent-aqua/20 text-accent-aqua',
        success: 'bg-accent-teal/20 text-accent-teal',
        warning: 'bg-accent-amber/20 text-accent-amber',
        danger: 'bg-accent-danger/20 text-accent-danger',
        info: 'bg-accent-blue/20 text-accent-blue',
      },
      size: {
        sm: 'text-[11px] px-2 py-0.5',
        md: 'text-[12px] px-2.5 py-1',
        lg: 'text-[13px] px-3 py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
  VariantProps<typeof badgeVariants> { }

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}
