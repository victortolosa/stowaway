import { useNavigate } from 'react-router-dom'
import { Card, IconBadge, EmptyState } from '@/components/ui'
import { Package, QrCode, ChevronRight, Pencil } from 'lucide-react'
import { Container, Group, Item } from '@/types'
import { Timestamp } from 'firebase/firestore'

// Helper to convert Firestore Timestamp to Date
// TODO: Move to shared utils
const toDate = (timestamp: Date | Timestamp | null | undefined): Date => {
    if (!timestamp) return new Date()
    // @ts-expect-error - Timestamp type checking
    if (typeof timestamp.toDate === 'function') {
        // @ts-expect-error - Timestamp type checking
        return timestamp.toDate()
    }
    return timestamp instanceof Date ? timestamp : new Date(Number(timestamp))
}

interface ContainerListProps {
    containers: Container[]
    groups: Group[]
    items: Item[]
    searchQuery: string
    onEditGroup: (group: Group) => void
    onAddContainer: () => void
}

export function ContainerList({
    containers,
    groups,
    items,
    searchQuery,
    onEditGroup,
    onAddContainer
}: ContainerListProps) {
    const navigate = useNavigate()

    if (searchQuery && containers.length === 0) return null
    // If no search query and no containers, show empty state
    if (!searchQuery && containers.length === 0) {
        return (
            <EmptyState
                message="No containers in this place yet"
                actionLabel="Add Your First Container"
                onAction={onAddContainer}
            />
        )
    }

    const getContainerColor = (index: number) => {
        const colors = ['var(--color-accent-blue)', 'var(--color-accent-blue)', 'var(--color-accent-blue)', 'var(--color-text-primary)', 'var(--color-accent-warning)']
        return colors[index % colors.length]
    }

    const getContainerItemCount = (containerId: string) => {
        return (items || []).filter((item) => item.containerId === containerId).length
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
                <h2 className="h2 text-text-primary">
                    {searchQuery ? 'Search Results' : 'Containers'}
                </h2>
            </div>

            <div className="flex flex-col gap-6">
                {/* Groups Section */}
                {groups.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {groups.map((group) => {
                            const groupContainers = containers.filter(c => c.groupId === group.id)
                            if (searchQuery && groupContainers.length === 0) return null

                            return (
                                <div key={group.id} className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div
                                            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all"
                                            onClick={() => navigate(`/groups/${group.id}`)}
                                        >
                                            <h3 className="font-display text-[18px] font-bold text-text-primary">
                                                {group.name}
                                            </h3>
                                            <span className="text-sm text-text-tertiary">
                                                ({groupContainers.length})
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => onEditGroup(group)}
                                            className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
                                        >
                                            <Pencil size={16} strokeWidth={2} />
                                        </button>
                                    </div>

                                    <div className="pl-4 border-l-2 border-border-standard ml-2">
                                        <div className="flex flex-col gap-3">
                                            {groupContainers.map((container, index) => (
                                                <Card
                                                    key={container.id}
                                                    variant="interactive"
                                                    onClick={() => navigate(`/containers/${container.id}`)}
                                                    className="flex items-center gap-[14px]"
                                                >
                                                    <IconBadge icon={Package} color={getContainerColor(index)} />
                                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-body text-[16px] font-semibold text-text-primary">
                                                                {container.name}
                                                            </h3>
                                                            {container.qrCodeId && (
                                                                <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-aqua/10 rounded-full">
                                                                    <QrCode size={12} className="text-accent-aqua" strokeWidth={2} />
                                                                    <span className="text-[10px] font-medium text-accent-aqua">QR</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="font-body text-[13px] text-text-secondary">
                                                            {getContainerItemCount(container.id)} items · Last updated{' '}
                                                            {(() => {
                                                                const date = toDate(container.lastAccessed)
                                                                const now = new Date()
                                                                const diffMs = now.getTime() - date.getTime()
                                                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                                                                if (diffDays === 0) return 'today'
                                                                if (diffDays === 1) return 'yesterday'
                                                                return `${diffDays}d ago`
                                                            })()}
                                                        </p>
                                                    </div>
                                                    <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Ungrouped Containers */}
                <div className="flex flex-col gap-3">
                    {containers.filter(c => !c.groupId).map((container, index) => (
                        <Card
                            key={container.id}
                            variant="interactive"
                            onClick={() => navigate(`/containers/${container.id}`)}
                            className="flex items-center gap-[14px]"
                        >
                            <IconBadge icon={Package} color={getContainerColor(index)} />
                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-body text-[16px] font-semibold text-text-primary">
                                        {container.name}
                                    </h3>
                                    {container.qrCodeId && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-accent-aqua/10 rounded-full">
                                            <QrCode size={12} className="text-accent-aqua" strokeWidth={2} />
                                            <span className="text-[10px] font-medium text-accent-aqua">QR</span>
                                        </div>
                                    )}
                                </div>
                                <p className="font-body text-[13px] text-text-secondary">
                                    {getContainerItemCount(container.id)} items · Last updated{' '}
                                    {(() => {
                                        const date = toDate(container.lastAccessed)
                                        const now = new Date()
                                        const diffMs = now.getTime() - date.getTime()
                                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                                        if (diffDays === 0) return 'today'
                                        if (diffDays === 1) return 'yesterday'
                                        return `${diffDays}d ago`
                                    })()}
                                </p>
                            </div>
                            <ChevronRight size={20} className="text-text-tertiary" strokeWidth={2} />
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
