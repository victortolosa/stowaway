import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { WifiOff } from 'lucide-react'

export function OfflineIndicator() {
    const isOnline = useNetworkStatus()

    if (isOnline) return null

    return (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-full shadow-lg text-white">
            <WifiOff size={16} className="text-red-400" />
            <span className="text-xs font-medium">Offline Mode</span>
        </div>
    )
}
