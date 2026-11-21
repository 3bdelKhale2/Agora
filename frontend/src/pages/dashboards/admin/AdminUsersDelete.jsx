import React, { useEffect, useState } from 'react'
import { api } from '../../../utils/api'
import toast from 'react-hot-toast'

export default function AdminUsersDelete(){
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    try {
      setLoading(true)
      const res = await api.get('/users', { params: { roles: ['ADMIN','EVENTS_OFFICE'].join(',') } })
      const all = res.data?.data || []
      const filtered = all.filter(u => (u.roles||[]).some(r => r === 'ADMIN' || r === 'EVENTS_OFFICE'))
      setUsers(filtered)
    } catch (e) {} finally { setLoading(false) }
  }
  useEffect(()=>{ load() }, [])

  const del = async (u) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return
    try {
      setBusyId(u._id)
      await api.delete(`/users/${u._id}`)
      toast.success('Deleted')
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to delete')
    } finally { setBusyId(null) }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Delete Admin / Events Office</h2>
      <div className="card">
        {loading ? (
          <div className="p-4 text-sm text-white/80">Loading...</div>
        ) : (
          <ul className="space-y-2">
            {users.map(u => {
              return (
                <li key={u._id} className="card flex items-center justify-between">
                  <div>
                    <div className="font-medium">{u.firstName} {u.lastName} — {u.email}</div>
                    <div className="text-xs text-gray-300">
                      Roles: {Array.isArray(u.roles) ? u.roles.join(', ') : (u.roles ? String(u.roles) : '—')}
                      {' | Signup Role: '}
                      {u.signupRole ? u.signupRole : '—'}
                    </div>
                  </div>
                  <button className="btn bg-red-600 hover:bg-red-700 disabled:opacity-60" disabled={busyId===u._id} onClick={()=>del(u)}>
                    {busyId===u._id ? 'Deleting...' : 'Delete'}
                  </button>
                </li>
              )
            })}
            {users.length === 0 && (
              <li className="p-4 text-sm text-white/70">No Admin or Events Office accounts found.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}
