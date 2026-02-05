import { useNavigate, useLocation } from 'react-router-dom'
import { Tabs } from '@/components/ui/Tabs'
import { cn } from '@/lib/utils'

export function ObjectViewTabs() {
    const navigate = useNavigate()
    const location = useLocation()

    // Determine active tab based on current path
    const getActiveTab = () => {
        if (location.pathname.startsWith('/places')) return 'places'
        if (location.pathname.startsWith('/containers')) return 'containers'
        if (location.pathname.startsWith('/items')) return 'items'
        return 'places'
    }

    const handleTabChange = (value: string) => {
        switch (value) {
            case 'places':
                navigate('/places')
                break
            case 'containers':
                navigate('/containers')
                break
            case 'items':
                navigate('/items')
                break
        }
    }

    return (
        <div className="relative mb-8 w-screen left-1/2 -translate-x-1/2 z-20">
            {/* Left Gradient Fade - Absolute to breakout container edges */}
            <div className="absolute left-0 top-0 bottom-0 w-[max(1.5rem,var(--safe-area-inset-left,0px))] pointer-events-none bg-gradient-to-r from-bg-page via-bg-page/80 to-transparent z-30" />

            <nav className={cn(
                "flex items-center overflow-x-auto no-scrollbar whitespace-nowrap py-1 scroll-smooth",
                // Content alignment:
                // Mobile: standard padding
                "px-[max(1.5rem,var(--safe-area-inset-left,0px))]",
                // Desktop: layout padding + centered gutter
                "md:px-[calc((100vw-1024px)/2+1.5rem)]"
            )}>
                <Tabs
                    activeTab={getActiveTab()}
                    onChange={handleTabChange}
                    showHome={true}
                    onHomeClick={() => navigate('/dashboard')}
                    tabs={[
                        { label: 'Places', value: 'places' },
                        { label: 'Containers', value: 'containers' },
                        { label: 'Items', value: 'items' },
                    ]}
                    className="!w-auto !gap-2" /* Override Tabs default w-full and gap if needed */
                />
            </nav>

            {/* Right Gradient Fade - Absolute to breakout container edges */}
            <div className="absolute right-0 top-0 bottom-0 w-[max(1.5rem,var(--safe-area-inset-right,0px))] pointer-events-none bg-gradient-to-l from-bg-page via-bg-page/80 to-transparent z-30" />
        </div>
    )
}
