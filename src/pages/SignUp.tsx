import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Package } from 'lucide-react'

export function SignUp() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleSignUp = async () => {
    try {
      setError('')
      setLoading(true)
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to sign up with Google')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      {/* Content */}
      <div className="flex-1 flex flex-col justify-between px-6 pt-10 pb-6">
        {/* Top Section */}
        <div className="flex flex-col gap-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="w-20 h-20 bg-accent-primary rounded-[20px] flex items-center justify-center">
              <Package className="w-10 h-10 text-text-on-accent" strokeWidth={2} />
            </div>

            {/* Welcome Text */}
            <div className="flex flex-col items-center gap-2">
              <h1 className="font-display text-[28px] font-bold text-text-primary text-center">
                Welcome to Stowaway
              </h1>
              <p className="font-body text-base text-text-secondary text-center">
                Organize your stuff, find it fast.
              </p>
            </div>
          </div>

          {/* Google Button */}
          <div className="w-full">
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-2xl">
                <p className="font-body text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full h-14 bg-bg-card border border-border-standard rounded-2xl flex items-center justify-center hover:bg-bg-elevated transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-body text-base font-medium text-text-primary">
                {loading ? 'Signing up...' : 'Continue with Google'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-6">
          {/* Sign In Row */}
          <div className="flex items-center gap-1">
            <span className="font-body text-sm text-text-secondary">Already have an account?</span>
            <Link to="/login" className="font-body text-sm font-semibold text-accent-primary">
              Sign in
            </Link>
          </div>

          {/* Terms Text */}
          <p className="font-body text-xs text-text-tertiary text-center w-full">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
