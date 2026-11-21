import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import FormInput from '../components/FormInput.jsx'
import AnimatedButton from '../components/AnimatedButton.jsx'
import GlassCard from '../components/GlassCard.jsx'
import toast from 'react-hot-toast'

const roleToPath = (roles) => {
  const r = roles || []
  if (r.includes('ADMIN')) return '/admin-dashboard'
  if (r.includes('EVENTS_OFFICE')) return '/eventoffice-dashboard'
  if (r.includes('PROFESSOR')) return '/professor-dashboard'
  if (r.includes('TA')) return '/ta-dashboard'
  if (r.includes('STAFF')) return '/staff-dashboard'
  if (r.includes('VENDOR')) return '/vendor-dashboard'
  return '/student-dashboard'
}

export default function Login() {
  const { login, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  // If already authenticated, immediately send to their dashboard
  useEffect(() => {
    if (user?.roles?.length) {
      nav(roleToPath(user.roles), { replace: true })
    }
  }, [user, nav])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Email and password are required')
    setLoading(true)
    try {
      const res = await login(email, password, rememberMe) // calls [backend/controllers/authController.js](backend/controllers/authController.js) login
      const dest = roleToPath(res.user.roles)
      // Always go straight to role dashboard (ignore previous protected page)
      nav(dest, { replace: true })
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold text-guc-gold">Sign In</h2>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <FormInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required inputClass="glass-input" />
          <FormInput label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required inputClass="glass-input" />
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e=>setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-guc-gold focus:ring-guc-gold"
              />
              <span>Remember me</span>
            </label>
            <Link className="text-guc-gold/90 hover:underline" to="/forgot-password">Forgot password?</Link>
          </div>
          <AnimatedButton className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </AnimatedButton>
        </form>
        <div className="mt-4 text-sm text-white/80">
          Don’t have an account? <Link className="text-guc-gold hover:underline" to="/signup">Sign up</Link>
        </div>
      </GlassCard>
    </div>
  )
}