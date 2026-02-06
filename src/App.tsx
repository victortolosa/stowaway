import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/react-query'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth'
import { upsertUserProfile } from '@/services/firebaseService'
import { ProtectedRoute, Layout, RootErrorBoundary } from '@/components'
import './styles/globals.css'

// Lazy load pages for better code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Places = lazy(() => import('@/pages/Places').then(m => ({ default: m.Places })))
const ItemsList = lazy(() => import('@/pages/ItemsList').then(m => ({ default: m.ItemsList })))
const ContainersList = lazy(() => import('@/pages/ContainersList').then(m => ({ default: m.ContainersList })))
const Container = lazy(() => import('@/pages/Container').then(m => ({ default: m.Container })))
const Item = lazy(() => import('@/pages/Item').then(m => ({ default: m.Item })))
const Login = lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })))
const SignUp = lazy(() => import('@/pages/SignUp').then(m => ({ default: m.SignUp })))
const PlaceDetail = lazy(() => import('@/pages/PlaceDetail').then(m => ({ default: m.PlaceDetail })))
const Search = lazy(() => import('@/pages/Search').then(m => ({ default: m.Search })))
const Profile = lazy(() => import('@/pages/Profile').then(m => ({ default: m.Profile })))
const Scan = lazy(() => import('@/pages/Scan').then(m => ({ default: m.Scan })))
const Tools = lazy(() => import('@/pages/Tools').then(m => ({ default: m.Tools })))
const GroupDetail = lazy(() => import('@/pages/GroupDetail').then(m => ({ default: m.GroupDetail })))
const Activity = lazy(() => import('@/pages/Activity').then(m => ({ default: m.Activity })))

function App() {
  const { setUser, setLoading } = useAuthStore()
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [setUser, setLoading])

  useEffect(() => {
    if (!user || !user.email) return
    upsertUserProfile({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }).catch((error) => {
      console.error('Failed to upsert user profile:', error)
    })
  }, [user])

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-bg-page">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-aqua"></div>
            </div>
          }>
            <div className="fixed inset-0 min-h-screen w-full bg-bg-page -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/20 via-bg-page to-bg-page pointer-events-none" />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />

              {/* Protected routes wrapped in Layout */}
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/places" element={<Places />} />
                <Route path="/items" element={<ItemsList />} />
                <Route path="/containers" element={<ContainersList />} />
                <Route path="/places/:id" element={<PlaceDetail />} />
                <Route path="/containers/:id" element={<Container />} />
                <Route path="/items/:id" element={<Item />} />
                <Route path="/search" element={<Search />} />
                <Route path="/scan" element={<Scan />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
                <Route path="/activity" element={<Activity />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </QueryClientProvider>
    </RootErrorBoundary>
  )
}

export default App
