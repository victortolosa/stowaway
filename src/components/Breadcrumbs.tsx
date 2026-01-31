import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
    label: string
    path?: string
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav className="flex items-center text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
            <Link
                to="/dashboard"
                className="flex items-center hover:text-gray-900 transition-colors"
                title="Dashboard"
            >
                <Home size={16} />
            </Link>

            {items.map((item, index) => (
                <div key={index} className="flex items-center">
                    <ChevronRight size={16} className="mx-2 text-gray-400" />
                    {item.path ? (
                        <Link
                            to={item.path}
                            className="hover:text-gray-900 hover:underline transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="font-medium text-gray-900 cursor-default">
                            {item.label}
                        </span>
                    )}
                </div>
            ))}
        </nav>
    )
}
