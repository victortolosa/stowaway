import { Outlet, useLocation } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { ReloadPrompt } from './ReloadPrompt'
import { OfflineIndicator } from './OfflineIndicator'
import { SyncStatus } from './SyncStatus'
import { Toast } from './ui/Toast'
import { BreadcrumbProvider, useBreadcrumbs } from '@/contexts/BreadcrumbContext'
import { Breadcrumbs } from './Breadcrumbs'

function GlobalBreadcrumbs() {
    const { items } = useBreadcrumbs()

    if (items.length === 0) return null

    return (
        <div className="w-full">
            <Breadcrumbs items={items} />
        </div>
    )
}

export function Layout() {
    const location = useLocation()

    // Hide tab bar on specific routes
    const showTabBar = !['/login', '/signup', '/scan'].includes(location.pathname)

    return (
        <BreadcrumbProvider>
            <div className="min-h-screen flex justify-center overflow-x-hidden">
                <div
                    className="w-full md:max-w-5xl min-h-screen relative flex flex-col transition-all duration-300"
                    style={{
                        paddingLeft: 'max(1.5rem, var(--safe-area-inset-left, 0px))',
                        paddingRight: 'max(1.5rem, var(--safe-area-inset-right, 0px))',
                        paddingTop: 'max(0.75rem, var(--safe-area-inset-top, 0px))',
                        paddingBottom: 'max(2rem, var(--safe-area-inset-bottom, 0px))',
                    }}
                >
                    <GlobalBreadcrumbs />
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
        </BreadcrumbProvider>
    )
}
