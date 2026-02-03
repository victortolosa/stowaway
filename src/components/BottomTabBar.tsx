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
        className="w-full max-w-md px-6 py-4 pointer-events-auto"
        style={{ paddingBottom: 'max(1.5rem, var(--safe-area-inset-bottom, 0px))' }}
      >
        {/* Tab Bar: height 64 (taller), glassy, blur, border, shadow-floating */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/40 rounded-full h-[64px] p-2 flex items-center justify-around shadow-floating ring-1 ring-black/5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.path)
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className="flex flex-col items-center justify-center gap-1 w-14 h-full relative"
              >
                {active && (
                  <div className="absolute -top-1 w-8 h-1 bg-accent-aqua rounded-full blur-[2px] opacity-60" />
                )}
                <Icon
                  size={24}
                  className={active ? 'text-accent-aqua drop-shadow-sm' : 'text-text-tertiary hover:text-text-secondary transition-colors'}
                  strokeWidth={active ? 2.5 : 2}
                />
                {/* Removed label for cleaner look, or verify if user wants it. Keeping it hidden if active for minimal style or showing dot. 
                    Let's keep the label but make it very subtle or remove for "best-in-class" clean look if agreed, 
                    but strictly following "Reskin" usually implies keeping functionality. 
                    I'll keep the label but make it smaller.
                */}
                <span
                  className={`font-display text-[10px] tracking-wide transition-all duration-300 ${active ? 'font-bold text-accent-aqua translate-y-0 opacity-100' : 'font-medium text-text-tertiary translate-y-0.5'
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
