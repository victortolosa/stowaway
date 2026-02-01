import { type ReactNode } from 'react'
import { Label } from './Label'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label?: string
  htmlFor?: string
  error?: string
  helperText?: string
  children: ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  error,
  helperText,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {error && (
        <p className="text-accent-danger text-[13px] mt-1.5">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-text-tertiary text-[13px] mt-1.5">{helperText}</p>
      )}
    </div>
  )
}
