import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth'
import { usePlaces } from '@/hooks/queries/usePlaces'
import { useAllContainers } from '@/hooks/queries/useAllContainers'
import { useAllItems } from '@/hooks/queries/useAllItems'
import { User, LogOut, MapPin, Package, Box, WifiOff } from 'lucide-react'
import { Card } from '@/components/ui'
import { useBreadcrumbs } from '@/contexts/BreadcrumbContext'

export function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const { data: places = [] } = usePlaces()
  const { data: containers = [] } = useAllContainers()
  const { data: items = [] } = useAllItems()

  // Set global breadcrumbs
  useBreadcrumbs([{ label: 'Profile', categoryPath: '/profile' }])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  return (
    <div className="pb-24 pt-2">
      <div className="max-w-mobile mx-auto px-1">
        <h1 className="font-display text-2xl font-bold text-text-primary mb-6">Profile</h1>

        <Card padding="lg" className="mb-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-accent-aqua rounded-full flex items-center justify-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-16 h-16 rounded-full" />
            ) : (
              <User size={32} className="text-text-on-accent" />
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-text-primary">
              {user?.displayName || 'User'}
            </h2>
            <p className="font-body text-sm text-text-secondary">{user?.email}</p>
          </div>
        </Card>

        {/* Storage Stats */}
        <Card padding="lg" className="mb-6">
          <h3 className="font-display text-base font-semibold text-text-primary mb-4">My Storage</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-accent-aqua/10 rounded-full flex items-center justify-center">
                <MapPin size={24} className="text-accent-aqua" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="font-display text-xl font-bold text-text-primary">{places.length}</p>
                <p className="font-body text-[12px] text-text-secondary">Places</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-accent-aqua/10 rounded-full flex items-center justify-center">
                <Package size={24} className="text-accent-aqua" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="font-display text-xl font-bold text-text-primary">{containers.length}</p>
                <p className="font-body text-[12px] text-text-secondary">Containers</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-accent-aqua/10 rounded-full flex items-center justify-center">
                <Box size={24} className="text-accent-aqua" strokeWidth={2} />
              </div>
              <div className="text-center">
                <p className="font-display text-xl font-bold text-text-primary">{items.length}</p>
                <p className="font-body text-[12px] text-text-secondary">Items</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Offline Info */}
        <Card padding="lg" className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <WifiOff size={20} className="text-slate-400" />
            <h3 className="font-display text-base font-semibold text-text-primary">Offline Mode</h3>
          </div>
          <p className="font-body text-sm text-text-secondary leading-relaxed">
            Stowaway works offline! You can browse your inventory and add new items even without an internet connection. Changes will sync automatically when you&apos;re back online.
          </p>
        </Card>

        <div className="space-y-3">
          <Card
            variant="interactive"
            onClick={handleLogout}
            className="flex items-center gap-3"
          >
            <LogOut size={20} className="text-accent-danger" />
            <span className="font-body text-base text-accent-danger font-medium">Sign Out</span>
          </Card>
        </div>
      </div>
    </div>
  )
}
