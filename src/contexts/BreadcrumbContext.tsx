import React, { createContext, useContext, useState, useEffect } from 'react'
import { BreadcrumbItem } from '@/components/Breadcrumbs'
import { useLocation } from 'react-router-dom'

interface BreadcrumbContextType {
    items: BreadcrumbItem[]
    setBreadcrumbs: (items: BreadcrumbItem[]) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined)

export function BreadcrumbProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<BreadcrumbItem[]>([])
    const location = useLocation()

    // Reset breadcrumbs on route change. 
    // This ensures that pages that don't call useBreadcrumbs(items) 
    // will have an empty breadcrumb list.
    useEffect(() => {
        setItems([])
    }, [location.pathname])

    return (
        <BreadcrumbContext.Provider value={{ items, setBreadcrumbs: setItems }}>
            {children}
        </BreadcrumbContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBreadcrumbs(initialItems?: BreadcrumbItem[]) {
    const context = useContext(BreadcrumbContext)
    if (context === undefined) {
        throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider')
    }

    const { setBreadcrumbs } = context
    const initialItemsString = initialItems ? JSON.stringify(initialItems) : ''

    useEffect(() => {
        if (initialItems) {
            setBreadcrumbs(initialItems)
        }
        // initialItems is intentionally omitted as we use initialItemsString for deep comparison
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialItemsString, setBreadcrumbs])

    return context
}
