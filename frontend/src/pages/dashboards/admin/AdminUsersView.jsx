import React, { useEffect, useState } from 'react'
import { api } from '../../../utils/api'
import toast from 'react-hot-toast'

const AUTO_VERIFIED_ROLES = new Set(['STUDENT', 'VENDOR', 'ADMIN', 'EVENTS_OFFICE'])
const isAutoVerified = (user) => (user.roles || []).some(r => AUTO_VERIFIED_ROLES.has(r)) || (user.signupRole && AUTO_VERIFIED_ROLES.has(user.signupRole))
const getRequestedRole = (user) => user?.roleApproval?.role || user?.signupRole || null
const hasRequestedRole = (user) => {
  const req = getRequestedRole(user)
  return !!req && (user.roles || []).includes(req)
}

export default function AdminUsersView(){
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
  const res = await api.get('/users', { params: q ? { q } : {} })
  console.log('API /users response:', res.data)
  setUsers(res.data.data || [])
    } catch (e) {
      // silent
    } finally { setLoading(false) }
  }
  useEffect(()=>{ loadUsers() }, [])

  const getVerificationStatus = (user) => {
    if (isAutoVerified(user) || hasRequestedRole(user)) return 'Verified: Yes'
    const status = user.roleApproval?.status
    if (status === 'APPROVED') return 'Verified: Yes'
    if (status === 'PENDING') return 'Pending Verification'
    if (status === 'REJECTED') return 'Rejected'
    return 'Verified: No'
  }

  const acceptVerification = async (u) => {
    if (isAutoVerified(u) || hasRequestedRole(u)) return // no-op for auto/effective verified
    try {
      const role = u?.roleApproval?.role
      let res
      if (role) {
        // Prefer assign-roles which marks approval and pushes role
        res = await api.patch(`/users/${u._id}/roles`, { role })
      } else {
        res = await api.patch(`/users/${u._id}/verify-approval`, { action: 'accept' })
      }
      toast.success(`Accepted verification for ${u.email}`)
      const updated = res.data?.user
      if (updated) setUsers(list => list.map(x => x._id === u._id ? { ...x, ...updated } : x))
      else setUsers(list => list.map(x => x._id === u._id ? { ...x, roleApproval: { ...(x.roleApproval||{}), status: 'APPROVED' } } : x))
      await loadUsers()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to accept verification')
    }
  }
  const rejectVerification = async (u) => {
    if (isAutoVerified(u) || hasRequestedRole(u)) return // no-op
    try {
      const note = window.prompt('Enter a rejection reason (optional)') || undefined
      const res = await api.patch(`/users/${u._id}/verify-approval`, { action: 'reject', note })
      toast.success(`Rejected verification for ${u.email}`)
      const updated = res.data?.user
      if (updated) setUsers(list => list.map(x => x._id === u._id ? { ...x, ...updated } : x))
      else setUsers(list => list.map(x => x._id === u._id ? { ...x, roleApproval: { ...(x.roleApproval||{}), status: 'REJECTED', note } } : x))
      await loadUsers()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to reject verification')
    }
  }

  const verifyEmailShortcut = async (u) => {
    try {
      const res = await api.patch(`/users/${u._id}/verify-email-shortcut`)
      toast.success(`Email verified for ${u.email}`)
      const updated = res.data?.user
      if (updated) setUsers(list => list.map(x => x._id === u._id ? { ...x, ...updated } : x))
      else setUsers(list => list.map(x => x._id === u._id ? { ...x, isVerifiedByEmail: true, emailVerifiedAt: new Date().toISOString() } : x))
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to verify email')
    }
  }

  console.log('Users state:', users)
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Users</h2>

      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <input className="border rounded px-3 py-2 text-black flex-1" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} />
          <button className="btn btn-primary" onClick={loadUsers} disabled={loading}>{loading ? 'Searching...' : 'Search'}</button>
        </div>
        <ul className="space-y-2">
          {users.map(user => {
            const roles = user.roles || []
            const displaySignup = roles.includes('ADMIN') ? 'ADMIN' : (roles.includes('EVENTS_OFFICE') ? 'EVENTS_OFFICE' : user.signupRole)
            const emailVerified = !!(user.isVerifiedByEmail || user.emailVerifiedAt)
            const status = user.roleApproval?.status
            const forcedVerified = isAutoVerified(user) || hasRequestedRole(user)
            const statusClass = forcedVerified ? 'bg-green-600' : (status === 'APPROVED' ? 'bg-green-600' : (status === 'PENDING' ? 'bg-yellow-600' : 'bg-red-600'))
            // const showActions = !forcedVerified  // replaced: we always want to allow email verify button
            return (
              <li key={user._id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {user.firstName} {user.lastName} — {user.email}
                      <span className={`text-xs px-2 py-1 rounded ${user.active ? 'bg-green-600' : 'bg-red-600'}`}>{user.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      Roles: {Array.isArray(user.roles) ? user.roles.join(', ') : (user.roles ? String(user.roles) : '—')}
                      {' | Signup Role: '}
                      {user.signupRole ? user.signupRole : '—'}
                    </div>
                    <div className="mt-2 flex gap-2 items-center">
                      <span className={`text-xs px-2 py-1 rounded ${user.isVerifiedByEmail ? 'bg-green-600' : 'bg-red-600'}`}>Email Verified: {user.isVerifiedByEmail ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {!forcedVerified && (
                      <div className="flex gap-2">
                        <button className="btn btn-primary" onClick={() => acceptVerification(user)} disabled={status === 'APPROVED'}>Accept</button>
                        <button className="btn" onClick={() => rejectVerification(user)} disabled={status === 'REJECTED'}>Reject</button>
                      </div>
                    )}
                    {!emailVerified && (
                      <button className="btn" onClick={() => verifyEmailShortcut(user)}>Verify Email (Shortcut)</button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
