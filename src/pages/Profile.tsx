import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth'
import { BottomTabBar } from '@/components'
import { User, LogOut } from 'lucide-react'
import { Card } from '@/components/ui'

export function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Failed to log out', error)
    }
  }

  return (
    <div className="min-h-screen bg-bg-page pb-[106px]">
      <div className="max-w-mobile mx-auto p-4">
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

      <BottomTabBar />
    </div>
  )
}
