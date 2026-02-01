import { Outlet, useLocation } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { ReloadPrompt } from './ReloadPrompt'

export function Layout() {
    const location = useLocation()

    // Hide tab bar on specific routes
    const showTabBar = !['/login', '/signup'].includes(location.pathname)

    return (
        <div className="min-h-screen flex justify-center">
            {/* 
              Responsive Container:
              - Mobile: Full width but with significant margins (px-8).
              - Desktop: Centered, max-w-5xl, with ample breathing room (px-12).
            */}
            <div
                className="w-full md:max-w-5xl min-h-screen relative flex flex-col transition-all duration-300 px-8 py-8 md:px-12 md:py-10"
                style={{ paddingLeft: '32px', paddingRight: '32px', paddingBottom: '32px', paddingTop: '32px' }}
            >
                <main className="flex-1 pb-24 w-full">
                    <Outlet />
                </main>
                {showTabBar && <BottomTabBar />}
                <ReloadPrompt />
            </div>
        </div>
    )
}
