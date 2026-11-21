import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import FormInput from '../components/FormInput.jsx'
import AnimatedButton from '../components/AnimatedButton.jsx'
import GlassCard from '../components/GlassCard.jsx'
import { FaUserGraduate, FaUserTie, FaChalkboardTeacher, FaUserShield, FaStore } from 'react-icons/fa'
import toast from 'react-hot-toast'

const roleMeta = [
  { key: 'STUDENT', label: 'Student', icon: FaUserGraduate },
  { key: 'STAFF', label: 'Staff', icon: FaUserTie },
  { key: 'TA', label: 'TA', icon: FaChalkboardTeacher },
  { key: 'PROFESSOR', label: 'Professor', icon: FaUserShield },
  { key: 'VENDOR', label: 'Vendor', icon: FaStore },
]

export default function Signup() {
  const { signup } = useAuth()
  const [role, setRole] = useState('STUDENT')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gucId, setGucId] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const isVendor = role === 'VENDOR'
  const onSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) return toast.error('Passwords do not match')
    // Domain policy: Students -> @student.guc.edu.eg, Staff/TA/Professor -> @guc.edu.eg (non-student)
    if (!isVendor) {
      const studentEmail = /@student\.guc\.edu\.eg$/i
      const staffEmail = /@guc\.edu\.eg$/i
      if (role === 'STUDENT' && !studentEmail.test(email)) {
        return toast.error('Students must use @student.guc.edu.eg email')
      }
      if (['STAFF','TA','PROFESSOR'].includes(role)) {
        if (!staffEmail.test(email) || studentEmail.test(email)) {
          return toast.error('Staff/TA/Professor must use @guc.edu.eg email')
        }
      }
    }
    const payload = {
      signupRole: role,
      email,
      password,
      firstName,
      lastName,
      gucId: isVendor ? undefined : gucId,
      companyName: isVendor ? companyName : undefined,
    }
    setLoading(true)
    try {
      const res = await signup(payload)
      if (!res.token) {
        toast.success('Check your email after admin approval')
        nav('/login', { replace: true })
        return
      }
      nav('/', { replace: true })
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassCard className="w-full max-w-2xl p-6">
        <h2 className="text-2xl font-semibold text-guc-gold">Create Account</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {roleMeta.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`glass px-3 py-2 rounded-xl flex items-center gap-2 ${role===key ? 'bg-guc-gold/20 ring-2 ring-guc-gold' : 'hover:bg-white/10'}`}
            >
              <Icon className={`${role===key ? 'text-guc-gold' : 'text-white/80'}`} />
              <span className={`${role===key ? 'text-guc-gold' : 'text-white/90'}`}>{label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {!isVendor && <>
            <FormInput label="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
            <FormInput label="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} required />
            <FormInput label="GUC ID" value={gucId} onChange={e=>setGucId(e.target.value)} placeholder="58-12345" required />
            <FormInput label="GUC Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={role==='STUDENT' ? 'you@student.guc.edu.eg' : 'you@guc.edu.eg'} required />
          </>}
          {isVendor && <>
            <FormInput label="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} required />
            <FormInput label="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} required />
            <FormInput label="Company Name" value={companyName} onChange={e=>setCompanyName(e.target.value)} required />
            <FormInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required />
          </>}
          <FormInput label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <FormInput label="Confirm Password" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />

          <div className="md:col-span-2 mt-2">
            <AnimatedButton className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Sign Up'}
            </AnimatedButton>
          </div>
        </form>

        <div className="mt-4 text-sm text-white/80">
          Already registered? <Link className="text-guc-gold hover:underline" to="/login">Sign in</Link>
        </div>
      </GlassCard>
    </div>
  )
}