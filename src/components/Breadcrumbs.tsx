import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
    label: string
    path?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps & { className?: string }) {
    return (
        <nav className={cn("flex items-center text-xs text-text-tertiary mb-4 overflow-x-auto no-scrollbar whitespace-nowrap", className)} aria-label="Breadcrumb">
            <Link
                to="/dashboard"
                className="flex items-center hover:text-text-primary transition-colors flex-shrink-0"
                title="Dashboard"
            >
                <Home size={14} />
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center">
                    <ChevronRight size={14} className="mx-1.5 text-text-quaternary flex-shrink-0" />
                    {item.path ? (
                        <Link
                            to={item.path}
                            className="hover:text-text-primary transition-colors flex items-center font-medium"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="font-medium text-text-secondary cursor-default">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}
