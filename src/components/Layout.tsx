import { Outlet, useLocation } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { ReloadPrompt } from './ReloadPrompt'

export function Layout() {
    const location = useLocation()

    // Hide tab bar on specific routes
    const showTabBar = !['/login', '/signup'].includes(location.pathname)

    return (
        <div className="p-4 min-h-screen bg-bg-page flex justify-center">
            <div className="w-full max-w-md bg-bg-page min-h-screen relative shadow-2xl flex flex-col">
                <main className="flex-1 pb-24">
                    <Outlet />
                </main>
                {showTabBar && <BottomTabBar />}
                <ReloadPrompt />
            </div>
        </div>
    )
}
