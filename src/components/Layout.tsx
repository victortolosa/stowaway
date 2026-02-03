import { Outlet, useLocation } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { ReloadPrompt } from './ReloadPrompt'
import { OfflineIndicator } from './OfflineIndicator'
import { SyncStatus } from './SyncStatus'
import { Toast } from './ui'

export function Layout() {
    const location = useLocation()

    // Hide tab bar on specific routes
    const showTabBar = !['/login', '/signup', '/scan'].includes(location.pathname)

    return (
        <div className="min-h-screen flex justify-center overflow-x-hidden">
            <div
                className="w-full md:max-w-5xl min-h-screen relative flex flex-col transition-all duration-300"
                style={{
                    paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                    paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))',
                    paddingTop: 'max(1.5rem, var(--safe-area-inset-top, 0px))',
                    paddingBottom: 'max(2rem, var(--safe-area-inset-bottom, 0px))',
                }}
            >
                <main className="flex-1 pb-32 w-full">
                    <Outlet />
                </main>
                {showTabBar && <BottomTabBar />}
                <ReloadPrompt />
                <OfflineIndicator />
                <SyncStatus />
                <Toast />
            </div>
        </div>
    )
}
