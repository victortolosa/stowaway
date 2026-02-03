import { useBackgroundSync } from '@/hooks/useBackgroundSync';
import { RefreshCw, CloudUpload } from 'lucide-react';

export function SyncStatus() {
    const { isSyncing, pendingCount } = useBackgroundSync();

    // If nothing pending and not syncing, hide
    if (pendingCount === 0 && !isSyncing) return null;

    return (
        <div className="fixed bottom-16 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-slate-900/90 border border-slate-700/50 rounded-full shadow-lg text-white backdrop-blur-sm animate-in slide-in-from-bottom-2">
            {isSyncing ? (
                <>
                    <RefreshCw size={14} className="animate-spin text-blue-400" />
                    <span className="text-xs font-medium">Syncing...</span>
                </>
            ) : (
                <>
                    <CloudUpload size={14} className="text-yellow-400" />
                    <span className="text-xs font-medium">{pendingCount} Pending</span>
                </>
            )}
        </div>
    );
}
