import { LayoutGrid, Search, ScanLine, User } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'home', label: 'Home', icon: LayoutGrid, path: '/dashboard' },
    { id: 'search', label: 'Search', icon: Search, path: '/search' },
    { id: 'scan', label: 'Scan', icon: ScanLine, path: '/scan' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50">
      {/* Tab Bar Section padding: [12, 24, 34, 24] */}
      {/* Add a gradient fade or solid background if needed. For floating pill, maybe just transparency or gradient */}
      <div className="bg-gradient-to-t from-bg-page via-bg-page to-transparent pt-3 px-6 pb-[34px]">
        {/* Tab Bar: height 60, corner radius 100, padding 8 */}
        <div className="bg-bg-surface rounded-full h-[60px] p-2 flex items-center justify-around shadow-floating">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.path)
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center gap-1 py-[6px] px-4"
              >
                <Icon
                  size={22}
                  className={active ? 'text-accent-pink' : 'text-text-tertiary'}
                  strokeWidth={2}
                />
                <span
                  className={`font-body text-[11px] ${active ? 'font-semibold text-accent-pink' : 'font-medium text-text-tertiary'
                    }`}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
