import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Card } from '@/components/ui'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    return (
        <Card padding="lg" className="mb-6">
            <h3 className="font-display text-base font-semibold text-text-primary mb-4">Appearance</h3>
            <div className="grid grid-cols-3 gap-2 p-1 bg-bg-subtle rounded-xl border border-border-light">
                <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-all duration-200 ${theme === 'light'
                            ? 'bg-bg-surface shadow-sm text-accent-aqua font-medium'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
                        }`}
                >
                    <Sun size={20} />
                    <span className="text-xs">Light</span>
                </button>
                <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-all duration-200 ${theme === 'dark'
                            ? 'bg-bg-surface shadow-sm text-accent-aqua font-medium'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
                        }`}
                >
                    <Moon size={20} />
                    <span className="text-xs">Dark</span>
                </button>
                <button
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-all duration-200 ${theme === 'system'
                            ? 'bg-bg-surface shadow-sm text-accent-aqua font-medium'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-surface/50'
                        }`}
                >
                    <Monitor size={20} />
                    <span className="text-xs">System</span>
                </button>
            </div>
        </Card>
    )
}
