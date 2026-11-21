import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GlassCard from '../components/GlassCard.jsx'
import FormInput from '../components/FormInput.jsx'
import AnimatedButton from '../components/AnimatedButton.jsx'
import { api } from '../utils/api'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [sp] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    setToken(sp.get('token') || '')
  }, [sp])

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!token) return toast.error('Invalid or missing token')
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      toast.success('Password updated. Please sign in.')
      nav('/login', { replace: true })
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold text-guc-gold">Set a New Password</h2>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <FormInput label="New Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <FormInput label="Confirm Password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          <AnimatedButton className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Reset Password'}
          </AnimatedButton>
        </form>
      </GlassCard>
    </div>
  )
}