import React, { useState } from 'react'
import { api } from '../../../utils/api'
import toast from 'react-hot-toast'

export default function AdminCreate(){
  const [form, setForm] = useState({ role: 'ADMIN', firstName: '', lastName: '', email: '', password: '' })
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.role || !form.firstName || !form.lastName || !form.email || !form.password) return
    const email = String(form.email || '').toLowerCase().trim()
    if (form.role === 'ADMIN' && !email.endsWith('@guc.edu.eg')) {
      toast.error('ADMIN email must end with @guc.edu.eg')
      return
    }
    try {
      setSubmitting(true)
      await api.post('/users/admins', form)
      toast.success(`New ${form.role} account created successfully!`)
      setForm({ role: 'ADMIN', firstName: '', lastName: '', email: '', password: '' })
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to create account')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Create ADMIN / EO</h2>
      <div className="card">
        <form onSubmit={onSubmit} className="grid md:grid-cols-6 gap-2">
          <select className="glass-input" value={form.role} onChange={e=>setForm(f=>({ ...f, role: e.target.value }))} required>
            <option value="ADMIN">ADMIN</option>
            <option value="EVENTS_OFFICE">EVENTS_OFFICE</option>
          </select>
          <input className="glass-input" placeholder="First name" value={form.firstName} onChange={e=>setForm(f=>({ ...f, firstName: e.target.value }))} required />
          <input className="glass-input" placeholder="Last name" value={form.lastName} onChange={e=>setForm(f=>({ ...f, lastName: e.target.value }))} required />
          <input className="glass-input" placeholder="Email" type="email" value={form.email} onChange={e=>setForm(f=>({ ...f, email: e.target.value }))} required />
          <input className="glass-input" placeholder="Password" type="password" value={form.password} onChange={e=>setForm(f=>({ ...f, password: e.target.value }))} required />
          <button
            className="btn btn-primary disabled:opacity-60"
            disabled={submitting || (form.role === 'ADMIN' && String(form.email || '').toLowerCase().trim() && !String(form.email || '').toLowerCase().trim().endsWith('@guc.edu.eg'))}
            title={form.role === 'ADMIN' && form.email && !String(form.email || '').toLowerCase().trim().endsWith('@guc.edu.eg') ? 'ADMIN email must end with @guc.edu.eg' : undefined}
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  )
}
