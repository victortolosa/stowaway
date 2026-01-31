import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

interface ConfirmDeleteModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    isDeleting?: boolean
}

export function ConfirmDeleteModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isDeleting = false,
}: ConfirmDeleteModalProps) {
    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-xl shadow-lg p-6 z-50">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-bold text-red-600">{title}</Dialog.Title>
                        <Dialog.Close className="text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </Dialog.Close>
                    </div>

                    <p className="text-gray-600 mb-6">{message}</p>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
