import { useRegisterSW } from 'virtual:pwa-register/react'

export function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered: ' + r)
        },
        onRegisterError(error: Error) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setOfflineReady(false)
        setNeedRefresh(false)
    }

    if (!offlineReady && !needRefresh) return null

    return (
        <div className="fixed bottom-0 right-0 p-4 m-4 z-50">
            <div className="bg-bg-card border border-border/50 text-text-primary p-4 rounded-lg shadow-xl flex flex-col gap-2 max-w-sm backdrop-blur-sm">
                <div className="flex flex-col gap-1">
                    <h3 className="font-bold">
                        {offlineReady ? 'App ready to work offline' : 'New content available'}
                    </h3>
                    <p className="text-sm text-text-secondary">
                        {offlineReady
                            ? 'You can now use this app without an internet connection.'
                            : 'Click reload to update the app to the latest version.'}
                    </p>
                </div>
                <div className="flex gap-2 justify-end mt-2">
                    {needRefresh && (
                        <button
                            className="px-3 py-1.5 bg-brand-primary text-white rounded-md text-sm font-medium hover:bg-brand-primary/90 transition-colors"
                            onClick={() => updateServiceWorker(true)}
                        >
                            Reload
                        </button>
                    )}
                    <button
                        className="px-3 py-1.5 bg-bg-surface text-text-primary border border-border hover:bg-bg-surface-hover rounded-md text-sm font-medium transition-colors"
                        onClick={close}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
