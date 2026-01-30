import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuthStore } from '@/store/auth'
import './styles/globals.css'

// Lazy load pages for better code splitting
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Places = lazy(() => import('@/pages/Places').then(m => ({ default: m.Places })))
const Container = lazy(() => import('@/pages/Container').then(m => ({ default: m.Container })))
const Item = lazy(() => import('@/pages/Item').then(m => ({ default: m.Item })))

function App() {
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [setUser, setLoading])

  return (
    <Router>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/places" element={<Places />} />
          <Route path="/containers/:id" element={<Container />} />
          <Route path="/items/:id" element={<Item />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
