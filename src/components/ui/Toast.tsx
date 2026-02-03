import { useUIStore } from '@/store/ui'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

export function Toast() {
    const { toast, hideToast } = useUIStore()

    const icons = {
        success: <CheckCircle size={20} className="text-accent-green" />,
        error: <AlertCircle size={20} className="text-red-500" />,
        info: <Info size={20} className="text-accent-blue" />,
    }

    return (
        <AnimatePresence>
            {toast.show && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-4 py-3 bg-bg-elevated/90 backdrop-blur-md border border-border-light shadow-lg rounded-full"
                    onClick={hideToast}
                >
                    {icons[toast.type]}
                    <span className="text-sm font-medium text-text-primary pr-2">
                        {toast.message}
                    </span>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
