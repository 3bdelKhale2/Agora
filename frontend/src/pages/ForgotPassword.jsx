import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard.jsx'
import FormInput from '../components/FormInput.jsx'
import AnimatedButton from '../components/AnimatedButton.jsx'
import { api } from '../utils/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      toast.success('If an account exists, a reset email was sent.')
      nav('/login')
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold text-guc-gold">Forgot Password</h2>
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <FormInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <AnimatedButton className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send reset link'}
          </AnimatedButton>
        </form>
      </GlassCard>
    </div>
  )
}