import { type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  className?: string
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full w-full h-full max-h-full',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const isFullScreen = size === 'full'

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content
          className={cn(
            'fixed bg-bg-page shadow-lg p-6 z-50',
            isFullScreen
              ? 'inset-0 w-full h-full overflow-y-auto'
              : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] rounded-card max-h-[90vh] overflow-y-auto',
            !isFullScreen && sizeClasses[size],
            className
          )}
        >
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="font-display text-[22px] font-bold text-text-primary">
              {title}
            </Dialog.Title>
            <Dialog.Close className="text-text-secondary hover:text-text-primary transition">
              <X size={24} />
            </Dialog.Close>
          </div>
          {description && (
            <Dialog.Description className="sr-only">
              {description}
            </Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
