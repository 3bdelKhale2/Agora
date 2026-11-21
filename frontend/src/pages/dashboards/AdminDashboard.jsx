import React, { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom';

export default function AdminDashboard(){
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')

  // Active menu section state
  const [activeSection, setActiveSection] = useState('users') // Default to users section

  // Create Admin/EO form state
  const [adminForm, setAdminForm] = useState({ role: 'ADMIN', firstName: '', lastName: '', email: '', password: '' })

  // Vendor requests and Events state
  const [vendorReqs, setVendorReqs] = useState([])
  const [events, setEvents] = useState([])

  // Track expanded user rows
  const [expanded, setExpanded] = useState(new Set())
  const toggleExpand = (id) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const loadUsers = async () => {
    try {
      const res = await api.get('/users', { params: q? { q } : {} })
      setUsers(res.data.data || [])
    } catch {}
  }
  const loadVendorReqs = async () => {
    try {
      // Get all vendor requests regardless of status to show full history
      const res = await api.get('/vendor-participations/all', { 
        params: { 
          limit: 50,
          populate: 'vendorProfile,event' // Ensure we get the full vendor profile and event details
        } 
      })
      setVendorReqs(res.data.data || [])
    } catch {}
  }
  const loadEvents = async () => {
    try {
      const res = await api.get('/events', { params: { limit: 50 } })
      setEvents(res.data.data || [])
    } catch {}
  }

  // Initial load
  useEffect(() => {
    loadUsers()
    loadVendorReqs()
    loadEvents()
  }, [])

  // Create Admin/EO handler
  const createAdminEO = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/users', { 
        ...adminForm, 
        roleApproval: { status: 'APPROVED', role: adminForm.role } // Auto-approve own admin role
      })
      toast.success('Admin/EO created successfully')
      setAdminForm({ role: 'ADMIN', firstName: '', lastName: '', email: '', password: '' }) // Reset form
      loadUsers() // Reload users
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create admin/EO')
    }
  }

  // Accept vendor request
  const acceptVendor = async (id) => {
    try {
      await api.put(`/vendor-participations/${id}/accept`)
      toast.success('Vendor request accepted')
      loadVendorReqs() // Reload vendor requests
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept vendor request')
    }
  }

  // Reject vendor request
  const rejectVendor = async (id) => {
    try {
      await api.put(`/vendor-participations/${id}/reject`)
      toast.success('Vendor request rejected')
      loadVendorReqs() // Reload vendor requests
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject vendor request')
    }
  }

  // Delete event
  const deleteEvent = async (id) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    try {
      await api.delete(`/events/${id}`)
      toast.success('Event deleted')
      setEvents(prev => prev.filter(e => e._id !== id)) // Optimistically update UI
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event')
    }
  }

  const location = useLocation();

  // Detect route for sidebar navigation
  React.useEffect(() => {
    if (location.pathname === '/admin-dashboard/vendors') {
      setActiveSection('vendors');
    } else if (location.pathname === '/admin-dashboard/users') {
      setActiveSection('users');
    } else if (location.pathname === '/admin-dashboard/events') {
      setActiveSection('events');
    }
    // ...add more if needed
  }, [location.pathname]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
      {/* Navigation Menu */}
      <div className="flex gap-4 border-b border-white/10 pb-2">
        <button 
          className={`px-4 py-2 rounded-t-lg ${activeSection === 'users' ? 'bg-white/10 font-semibold' : 'hover:bg-white/5'}`}
          onClick={() => setActiveSection('users')}
        >
          Users Management
        </button>
        <button 
          className={`px-4 py-2 rounded-t-lg ${activeSection === 'vendors' ? 'bg-white/10 font-semibold' : 'hover:bg-white/5'}`}
          onClick={() => setActiveSection('vendors')}
        >
          Vendor Requests
        </button>
        <button 
          className={`px-4 py-2 rounded-t-lg ${activeSection === 'events' ? 'bg-white/10 font-semibold' : 'hover:bg-white/5'}`}
          onClick={() => setActiveSection('events')}
        >
          Events Management
        </button>
        {/* Add new function/section to the menu */}
        <button 
          className={`px-4 py-2 rounded-t-lg ${activeSection === 'newFunction' ? 'bg-white/10 font-semibold' : 'hover:bg-white/5'}`}
          onClick={() => setActiveSection('newFunction')}
        >
          New Function Test
        </button>
      </div>
      {/* Users Section */}
      {activeSection === 'users' && (
        <React.Fragment>
          <div className="card">
            <h3 className="font-semibold mb-3">Create Admin / Events Office</h3>
            <form onSubmit={createAdminEO} className="grid md:grid-cols-6 gap-2">
              <select className="glass-input" value={adminForm.role} onChange={e=>setAdminForm(f=>({ ...f, role: e.target.value }))}>
                <option value="ADMIN">ADMIN</option>
                <option value="EVENTS_OFFICE">EVENTS_OFFICE</option>
              </select>
              <input className="glass-input" placeholder="First name" value={adminForm.firstName} onChange={e=>setAdminForm(f=>({ ...f, firstName: e.target.value }))} required />
              <input className="glass-input" placeholder="Last name" value={adminForm.lastName} onChange={e=>setAdminForm(f=>({ ...f, lastName: e.target.value }))} required />
              <input className="glass-input" placeholder="Email" type="email" value={adminForm.email} onChange={e=>setAdminForm(f=>({ ...f, email: e.target.value }))} required />
              <input className="glass-input" placeholder="Password" type="password" value={adminForm.password} onChange={e=>setAdminForm(f=>({ ...f, password: e.target.value }))} required />
              <button className="btn btn-primary">Create</button>
            </form>
          </div>
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold flex-1">Users</h3>
              <input className="border rounded px-3 py-2 text-black" placeholder="Search..." value={q} onChange={e=>setQ(e.target.value)} />
              <button className="btn btn-primary" onClick={loadUsers}>Search</button>
            </div>
            <ul className="space-y-2">
              {users.map(u => {
                const isVerified = u.roleApproval?.status === 'APPROVED';
                const emailVerified = !!(u.isVerifiedByEmail || u.emailVerifiedAt);
                const isExpanded = expanded.has(u._id);
                return (
                  <li key={u._id} className="card">
                    {/* Collapsed header */}
                    <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => toggleExpand(u._id)}>
                      <div>
                        <div className="font-medium">{u.firstName} {u.lastName} — {u.email}</div>
                        <div className="text-xs text-gray-300">Roles: {u.roles?.join(', ') || '—'} | Signup: {u.signupRole}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-1 rounded ${isVerified ? 'bg-green-500/30' : 'bg-yellow-500/30'}`}>Verified: {isVerified ? 'Yes' : 'No'}</span>
                        <span className={`text-xs px-2 py-1 rounded ${emailVerified ? 'bg-green-500/30' : 'bg-yellow-500/30'}`}>Email Verified: {emailVerified ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                    {/* Expanded controls */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-3" onClick={(e)=>e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">Verification</div>
                          {!isVerified ? (
                            <div className="flex gap-2">
                              <button className="btn btn-primary" onClick={async () => { await acceptVerification(u); await loadUsers(); }}>Accept</button>
                              <button className="btn" onClick={async () => { await rejectVerification(u); await loadUsers(); }}>Reject</button>
                            </div>
                          ) : (
                            <span className="text-sm text-white/80">User is already verified</span>
                          )}
                        </div>
                        <div className="text-xs text-white/80 grid md:grid-cols-3 gap-2">
                          <div>Status: <span className="font-semibold">{u.roleApproval?.status || 'NONE'}</span></div>
                          {u.roleApproval?.role && <div>Requested Role: {u.roleApproval.role}</div>}
                          {u.roleApproval?.initiatedAt && <div>Initiated: {new Date(u.roleApproval.initiatedAt).toLocaleString()}</div>}
                          {u.roleApproval?.decidedAt && <div>Decided: {new Date(u.roleApproval.decidedAt).toLocaleString()}</div>}
                          {u.roleApproval?.note && <div className="md:col-span-3">Note: {u.roleApproval.note}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">Email</div>
                          {!emailVerified ? (
                            <React.Fragment>
                              <button className="btn" onClick={async () => { await verifyEmailShortcut(u); await loadUsers(); }}>Verify Email (Shortcut)</button>
                              {isVerified && <button className="btn" onClick={() => triggerVerification(u._id)}>Resend Verification Email</button>}
                            </React.Fragment>
                          ) : null}
                          {emailVerified && (
                            <span className="text-sm text-white/80">Email already verified</span>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </React.Fragment>
      )}
      {/* Vendor Requests Section */}
      {activeSection === 'vendors' && (
        <div className="card">
          <h3 className="font-semibold mb-2">Vendor Requests (Pending)</h3>
          <ul className="space-y-2">
            {vendorReqs.filter(r => r.status === 'PENDING').length === 0 && (
              <li className="text-gray-400">No pending vendor requests.</li>
            )}
            {vendorReqs.filter(r => r.status === 'PENDING').map(r => (
              <li key={r._id} className="card">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{r.kind} — {r.vendorProfile?.companyName || 'Vendor'}</div>
                    <div className="text-xs text-gray-300 mt-1">
                      <div>Event: {r.event ? r.event.title : 'No event'}</div>
                      <div>Location: {r.mapLocationId || 'Not specified'}</div>
                      <div>Booth Size: {r.boothSize}</div>
                      {r.vendorProfile && (
                        <React.Fragment>
                          <div>Contact: {r.vendorProfile.contactName}</div>
                          <div>Email: {r.vendorProfile.contactEmail}</div>
                          <div>Phone: {r.vendorProfile.contactPhone}</div>
                        </React.Fragment>
                      )}
                      {r.proposedItems && (
                        <div>Products/Services: {r.proposedItems}</div>
                      )}
                      {r.specialRequirements && (
                        <div>Special Requirements: {r.specialRequirements}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-primary" 
                      onClick={()=>acceptVendor(r._id)}
                    >
                      Accept
                    </button>
                    <button 
                      className="btn"
                      onClick={()=>rejectVendor(r._id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Events Section */}
      {activeSection === 'events' && (
        <div className="card">
          <h3 className="font-semibold mb-2">Events Management</h3>
          <ul className="space-y-2">
            {events.map(e => (
              <li key={e._id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium">{e.title} <span className="text-xs opacity-70">({e.type})</span></div>
                  <div className="text-xs text-gray-300">Status: {e.status}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn" onClick={()=>deleteEvent(e._id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* New Function Section */}
      {activeSection === 'newFunction' && (
        <div className="card">
          <h3 className="font-semibold mb-2">New Function Test Section</h3>
          <p>Test your new function here. Add your UI and logic as needed.</p>
        </div>
      )}
    </div>
  );
}