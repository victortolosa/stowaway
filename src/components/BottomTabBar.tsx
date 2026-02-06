import { LayoutGrid, Search, ScanLine, Wrench } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export function BottomTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const tabs = [
    { id: 'home', label: 'Home', icon: LayoutGrid, path: '/dashboard' },
    { id: 'search', label: 'Search', icon: Search, path: '/search' },
    { id: 'scan', label: 'Scan', icon: ScanLine, path: '/scan' },
    { id: 'tools', label: 'Tools', icon: Wrench, path: '/tools' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div
        className="w-full max-w-sm px-4 py-3 pointer-events-auto"
        style={{ paddingBottom: 'max(1.5rem, var(--safe-area-inset-bottom, 0px))' }}
      >
        {/* Tab Bar: tighter height, glassy, blur, border, shadow-floating */}
        <div className="bg-bg-surface/80 backdrop-blur-xl border border-border-light/40 rounded-full h-[54px] px-2.5 py-1.5 flex items-center justify-between shadow-floating ring-1 ring-black/5 dark:ring-white/5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.path)
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex-1 h-full flex items-center justify-center relative"
              >
                <div
                  className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-full transition-colors duration-300 ${active ? 'bg-accent-aqua/15 ring-1 ring-accent-aqua/30' : 'bg-transparent'
                    }`}
                >
                  <Icon
                    size={18}
                    className={active ? 'text-accent-aqua' : 'text-text-tertiary hover:text-text-secondary transition-colors'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {/* Removed label for cleaner look, or verify if user wants it. Keeping it hidden if active for minimal style or showing dot. 
                    Let's keep the label but make it very subtle or remove for "best-in-class" clean look if agreed, 
                    but strictly following "Reskin" usually implies keeping functionality. 
                    I'll keep the label but make it smaller.
                */}
                  <span
                    className={`font-display text-[10px] tracking-wide transition-colors duration-300 ${active ? 'font-bold text-accent-aqua opacity-100' : 'font-medium text-text-tertiary'
                      }`}
                  >
                    {tab.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
