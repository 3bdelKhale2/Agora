import React, { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import toast from 'react-hot-toast'
import EventCard from '../../components/EventCard.jsx'
import AnimatedButton from '../../components/AnimatedButton.jsx'
import RegisterDialog from '../../components/RegisterDialog.jsx'
import PaymentDialog from '../../components/PaymentDialog.jsx'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProfessorDashboard(){
  const [mine, setMine] = useState([])
  const [regsUpcoming, setRegsUpcoming] = useState([])
  const [regsPast, setRegsPast] = useState([])

  // Browse events (to register)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [professorName, setProfessorName] = useState('')
  const [dlgOpen, setDlgOpen] = useState(false)
  const [dlgEvent, setDlgEvent] = useState(null)
  const [paymentReg, setPaymentReg] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const { user } = useAuth()

  // Create form
  const [form, setForm] = useState({
    title: '',
    location: 'GUC_CAIRO',
    startAt: '',
    endAt: '',
    shortDescription: '',
    fullAgenda: '',
    faculty: '',
    professorsParticipating: '', // comma-separated names
    requiredBudget: '',
    fundingSource: 'GUC',
    extraResources: '',
    price: '',
    capacity: '',
    registrationDeadline: '',
  })

  // Edit form
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ...form })
  const [pendingUpdate, setPendingUpdate] = useState(null)

  // Section selection via hash
  const location = useLocation()
  const sectionHash = (location.hash || '').replace('#','')
  const section = ['browse','create','my-workshops','registrations'].includes(sectionHash) ? sectionHash : 'browse'

  const loadMine = async () => {
    try {
      const res = await api.get('/events?type=WORKSHOP&mine=1&sort=-createdAt')
      setMine(res.data.data || [])
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to load')
    }
  }
  const loadRegs = async () => {
    try {
      const [up, past] = await Promise.all([
        api.get('/registrations/me', { params: { upcoming: '1', limit: 50 } }),
        api.get('/registrations/me', { params: { past: '1', limit: 50 } }),
      ])
      setRegsUpcoming(up.data.data || [])
      setRegsPast(past.data.data || [])
    } catch {}
  }
  const loadWallet = async () => {
    try {
      const res = await api.get('/users/me')
      setWalletBalance(res.data?.walletBalance ?? 0)
    } catch {}
  }
  const loadEvents = async () => {
    try {
      const params = { status: 'PUBLISHED' }
      if (q) params.q = q
      if (type) params.type = type
      if (professorName) params.professorName = professorName
      const res = await api.get('/events', { params })
      setEvents(res.data.data || [])
    } catch {}
    setLoadingEvents(false)
  }
  const regByEvent = {}
  regsUpcoming.forEach(r => { if (r.event?._id) regByEvent[r.event._id] = r })
  useEffect(()=>{ loadMine(); loadRegs(); loadEvents(); loadWallet(); }, [])

  const toPayload = (f) => ({
    title: f.title,
    location: f.location,
    startAt: f.startAt,
    endAt: f.endAt,
    shortDescription: f.shortDescription,
    fullAgenda: f.fullAgenda,
    faculty: f.faculty,
    professors: (f.professorsParticipating || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    requiredBudget: f.requiredBudget !== '' ? Number(f.requiredBudget) : undefined,
    fundingSource: f.fundingSource,
    extraResources: f.extraResources,
    price: f.price !== '' ? Number(f.price) : undefined,
    capacity: f.capacity !== '' ? Number(f.capacity) : undefined,
    registrationDeadline: f.registrationDeadline || undefined,
  })

  const create = async (e) => {
    e.preventDefault()
    try {
      const s = form.startAt ? new Date(form.startAt) : null
      const eend = form.endAt ? new Date(form.endAt) : null
      const r = form.registrationDeadline ? new Date(form.registrationDeadline) : null
      const now = new Date()
      if (!s || !eend || Number.isNaN(s.getTime()) || Number.isNaN(eend.getTime())) {
        return toast.error('Please provide valid start and end dates')
      }
      if (s.getTime() <= now.getTime()) return toast.error('Start must be in the future')
      if (s.getTime() >= eend.getTime()) return toast.error('End must be after start')
      if (r) {
        if (Number.isNaN(r.getTime())) return toast.error('Invalid registration deadline')
        if (r.getTime() >= s.getTime()) return toast.error('Registration deadline must be before start date')
        if (r.getTime() <= now.getTime()) return toast.error('Registration deadline must be in the future')
      }
      await api.post('/events/workshops', toPayload(form))
      toast.success('Workshop created (pending)')
      setForm({
        title: '',
        location: 'GUC_CAIRO',
        startAt: '',
        endAt: '',
        shortDescription: '',
        fullAgenda: '',
        faculty: '',
        professorsParticipating: '',
        requiredBudget: '',
        fundingSource: 'GUC',
        extraResources: '',
        price: '',
        capacity: '',
        registrationDeadline: '',
      })
      loadMine()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to create')
    }
  }

  const startEdit = (w) => {
    setEditingId(w._id)
    setPendingUpdate(w.pendingUpdate || null)
    setEditForm({
      title: w.title || '',
      location: w.location || 'GUC_CAIRO',
      startAt: w.startAt ? w.startAt.slice(0,16) : '',
      endAt: w.endAt ? w.endAt.slice(0,16) : '',
      shortDescription: w.shortDescription || '',
      fullAgenda: w.fullAgenda || '',
      faculty: w.faculty || '',
      professorsParticipating: Array.isArray(w.professors) ? w.professors.join(', ') : '',
      requiredBudget: w.requiredBudget ?? '',
      fundingSource: w.fundingSource || 'GUC',
      extraResources: w.extraResources || '',
      price: w.price ?? '',
      capacity: w.capacity ?? '',
      registrationDeadline: w.registrationDeadline ? String(w.registrationDeadline).slice(0,16) : '',
    })
  }
  const cancelEdit = () => { setEditingId(null); setEditForm({ ...form }); setPendingUpdate(null) }

  const saveEdit = async (e) => {
    e.preventDefault()
    try {
      const s = editForm.startAt ? new Date(editForm.startAt) : null
      const eend = editForm.endAt ? new Date(editForm.endAt) : null
      const r = editForm.registrationDeadline ? new Date(editForm.registrationDeadline) : null
      const now = new Date()
      if (!s || !eend || Number.isNaN(s.getTime()) || Number.isNaN(eend.getTime())) {
        return toast.error('Please provide valid start and end dates')
      }
      if (s.getTime() <= now.getTime()) return toast.error('Start must be in the future')
      if (s.getTime() >= eend.getTime()) return toast.error('End must be after start')
      if (r) {
        if (Number.isNaN(r.getTime())) return toast.error('Invalid registration deadline')
        if (r.getTime() >= s.getTime()) return toast.error('Registration deadline must be before start date')
        if (r.getTime() <= now.getTime()) return toast.error('Registration deadline must be in the future')
      }
      await api.patch(`/events/${editingId}`, toPayload(editForm))
      toast.success('Updated')
      cancelEdit(); loadMine()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update')
    }
  }

  const on = (setter) => (e) => setter(v => ({ ...v, [e.target.name]: e.target.value }))

  const acceptProposed = async () => {
    try {
      await api.patch(`/events/${editingId}/accept-edits`)
      toast.success('Proposed changes accepted')
      cancelEdit(); loadMine()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to accept changes')
    }
  }
  const rejectProposed = async () => {
    const note = window.prompt('Add a note (optional)') || undefined
    try {
      await api.patch(`/events/${editingId}/reject-edits`, { note })
      toast.success('Requested edits rejected')
      cancelEdit(); loadMine()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to reject')
    }
  }

  const register = async (eventId) => {
    try {
      const ev = events.find(e => e._id === eventId)
      const res = await api.post('/registrations', { event: eventId })
      const reg = res.data
      if (reg.paymentStatus === 'PAID') {
        toast.success('Registered & paid')
      } else if (['WORKSHOP','TRIP'].includes(ev?.type)) {
        const price = ev?.tripDetails?.price ?? ev?.workshopDetails?.price ?? ev?.price ?? 0
        if (price > 0) {
          toast.success('Registered! Redirecting to My Registrations to pay')
        } else {
          toast.success('Registered')
        }
      } else {
        toast.success('Registered')
      }
      // Always redirect to registrations after successful registration
      window.location.hash = 'registrations'
      loadRegs(); loadWallet()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to register')
    }
  }
  const cancelRegistration = async (reg) => {
    try {
      await api.delete(`/registrations/${reg._id}`)
      toast.success('Registration cancelled')
      loadRegs(); loadWallet()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Cancellation failed')
    }
  }
  const openRegisterDialog = (ev) => { setDlgEvent(ev); setDlgOpen(true) }
  const closeRegisterDialog = () => { setDlgOpen(false); setDlgEvent(null) }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Professor Dashboard</h2>

      {/* Browse Events to register */}
      {section === 'browse' && (
        <div className="card" id="browse">
          <h3 className="font-semibold">Browse Events</h3>
          <div className="grid md:grid-cols-4 gap-2 mt-3">
            <input className="glass-input" placeholder="Search (title/desc)" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="glass-input" value={type} onChange={e=>setType(e.target.value)}>
              <option value="">All Types</option>
              <option value="WORKSHOP">WORKSHOP</option>
              <option value="TRIP">TRIP</option>
              <option value="CONFERENCE">CONFERENCE</option>
              <option value="BAZAAR">BAZAAR</option>
              <option value="GYM_SESSION">GYM_SESSION</option>
            </select>
            <input className="glass-input" placeholder="Professor name (workshops)" value={professorName} onChange={e=>setProfessorName(e.target.value)} />
            <AnimatedButton onClick={loadEvents}>Search</AnimatedButton>
          </div>
          {!loadingEvents && (
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {events.map(ev => {
                const existingReg = regByEvent[ev._id]
                const price = ev?.tripDetails?.price ?? ev?.workshopDetails?.price ?? ev?.price ?? 0
                let action = null
                if (['WORKSHOP','TRIP'].includes(ev.type)) {
                  if (existingReg) {
                    const isPaid = existingReg.paymentStatus === 'PAID'
                    const isPendingPay = existingReg.paymentStatus === 'PENDING' || existingReg.paymentStatus === 'UNPAID'
                    if (isPaid) {
                      action = <div className="mt-3 text-xs text-emerald-400">✓ Registered</div>
                    } else if (isPendingPay && price > 0) {
                      action = <AnimatedButton className="mt-3" onClick={() => setPaymentReg({ ...existingReg, event: ev })}>Pay</AnimatedButton>
                    } else {
                      action = <div className="mt-3 text-xs text-yellow-400">Pending</div>
                    }
                  } else {
                    action = <AnimatedButton className="mt-3" onClick={() => openRegisterDialog(ev)}>Register</AnimatedButton>
                  }
                }
                return (
                  <EventCard
                    key={ev._id}
                    event={ev}
                    action={action}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Workshop */}
      {section === 'create' && (
        <form onSubmit={create} className="card grid md:grid-cols-3 gap-3" id="create">
          <input className="glass-input md:col-span-3" name="title" placeholder="Workshop Title" value={form.title} onChange={on(setForm)} required />

          <select className="glass-input" name="location" value={form.location} onChange={on(setForm)} required>
            <option value="GUC_CAIRO">GUC Cairo</option>
            <option value="GUC_BERLIN">GUC Berlin</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Start</span>
            <input aria-label="Start date and time" className="glass-input flex-1" name="startAt" type="datetime-local" min={new Date().toISOString().slice(0,16)} value={form.startAt} onChange={on(setForm)} required />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">End</span>
            <input aria-label="End date and time" className="glass-input flex-1" name="endAt" type="datetime-local" min={(form.startAt||new Date().toISOString().slice(0,16))} value={form.endAt} onChange={on(setForm)} required />
          </div>

          <input className="glass-input md:col-span-3" name="faculty" placeholder="Faculty responsible (e.g., MET, IET)" value={form.faculty} onChange={on(setForm)} required />

          <textarea className="glass-input md:col-span-3" name="shortDescription" placeholder="Short description" value={form.shortDescription} onChange={on(setForm)} required />
          <textarea className="glass-input md:col-span-3" name="fullAgenda" placeholder="Full agenda" value={form.fullAgenda} onChange={on(setForm)} required />

          <input className="glass-input md:col-span-3" name="professorsParticipating" placeholder="Professors participating (comma-separated)" value={form.professorsParticipating} onChange={on(setForm)} required />

          <input className="glass-input" name="requiredBudget" type="number" step="0.01" min="0" placeholder="Required budget" value={form.requiredBudget} onChange={on(setForm)} required />
          <select className="glass-input" name="fundingSource" value={form.fundingSource} onChange={on(setForm)} required>
            <option value="GUC">GUC</option>
            <option value="EXTERNAL">External</option>
          </select>
          <input className="glass-input" name="price" type="number" step="0.01" min="0" placeholder="Price per attendee" value={form.price} onChange={on(setForm)} required />
          <input className="glass-input" name="capacity" type="number" min="1" step="1" placeholder="Capacity" value={form.capacity} onChange={on(setForm)} required />

          <div className="md:col-span-3">
            <label htmlFor="registrationDeadline_create" className="text-sm block mb-1">
              Registration deadline
            </label>
            <input
              id="registrationDeadline_create"
              aria-label="Registration deadline"
              className="glass-input w-full"
              name="registrationDeadline"
              type="datetime-local"
              value={form.registrationDeadline}
              min={new Date().toISOString().slice(0,16)}
              onChange={on(setForm)}
              required
            />
          </div>

          <textarea className="glass-input md:col-span-3" name="extraResources" placeholder="Extra required resources" value={form.extraResources} onChange={on(setForm)} />

          <button className="btn btn-primary md:col-span-3">Create Workshop</button>
        </form>
      )}

      {/* My Workshops */}
      {section === 'my-workshops' && (
        <div id="my-workshops">
          <h3 className="font-semibold mb-2">My Workshops</h3>
          <ul className="space-y-2">
            {mine.map(m => (
              <li key={m._id} className="card">
                {editingId === m._id ? (
                  <form onSubmit={saveEdit} className="grid md:grid-cols-3 gap-2">
                    <input className="glass-input md:col-span-3" name="title" value={editForm.title} onChange={on(setEditForm)} />
                    <select className="glass-input" name="location" value={editForm.location} onChange={on(setEditForm)}>
                      <option value="GUC_CAIRO">GUC Cairo</option>
                      <option value="GUC_BERLIN">GUC Berlin</option>
                    </select>
                    <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">Start</span><input aria-label="Start date and time" className="glass-input flex-1" name="startAt" type="datetime-local" min={new Date().toISOString().slice(0,16)} value={editForm.startAt} onChange={on(setEditForm)} /></div>
                    <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">End</span><input aria-label="End date and time" className="glass-input flex-1" name="endAt" type="datetime-local" min={(editForm.startAt||new Date().toISOString().slice(0,16))} value={editForm.endAt} onChange={on(setEditForm)} /></div>
                    <input className="glass-input md:col-span-3" name="faculty" value={editForm.faculty} onChange={on(setEditForm)} />
                    <textarea className="glass-input md:col-span-3" name="shortDescription" value={editForm.shortDescription} onChange={on(setEditForm)} />
                    <textarea className="glass-input md:col-span-3" name="fullAgenda" value={editForm.fullAgenda} onChange={on(setEditForm)} />
                    <input className="glass-input md:col-span-3" name="professorsParticipating" value={editForm.professorsParticipating} onChange={on(setEditForm)} />
                    <input className="glass-input" name="requiredBudget" type="number" step="0.01" min="0" placeholder="Required budget" value={editForm.requiredBudget} onChange={on(setEditForm)} />
                    <select className="glass-input" name="fundingSource" value={editForm.fundingSource} onChange={on(setEditForm)}>
                      <option value="GUC">GUC</option>
                      <option value="EXTERNAL">External</option>
                    </select>
                    <input className="glass-input" name="price" type="number" step="0.01" min="0" placeholder="Price per attendee" value={editForm.price} onChange={on(setEditForm)} />
                    <input className="glass-input" name="capacity" type="number" min="1" step="1" placeholder="Capacity" value={editForm.capacity} onChange={on(setEditForm)} />
                    <div className="md:col-span-3">
                      <label htmlFor="registrationDeadline_edit" className="text-sm block mb-1">
                        Registration deadline
                      </label>
                      <input
                        id="registrationDeadline_edit"
                        aria-label="Registration deadline"
                        className="glass-input w-full"
                        name="registrationDeadline"
                        type="datetime-local"
                        value={editForm.registrationDeadline}
                        min={new Date().toISOString().slice(0,16)}
                        onChange={on(setEditForm)}
                      />
                    </div>
                    <textarea className="glass-input md:col-span-3" name="extraResources" value={editForm.extraResources} onChange={on(setEditForm)} />
                    <div className="md:col-span-3 flex gap-2">
                      <button className="btn btn-primary" type="submit">Save</button>
                      <button className="btn" type="button" onClick={cancelEdit}>Cancel</button>
                      {m.status === 'NEEDS_EDITS' && m.pendingUpdate && (
                        <>
                          <button className="btn" type="button" onClick={acceptProposed}>Accept</button>
                          <button className="btn" type="button" onClick={rejectProposed}>Reject</button>
                        </>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{m.title} — <span className="text-xs opacity-80">{m.status}</span></div>
                      <div className="text-xs text-white/70">
                        {m.location === 'GUC_BERLIN' ? 'GUC Berlin' : 'GUC Cairo'} | {new Date(m.startAt).toLocaleString()} — {new Date(m.endAt).toLocaleString()}
                      </div>
                      {m.shortDescription && <div className="text-xs text-white/80 mt-1">{m.shortDescription}</div>}
                      {m.reviewNotes && <div className="text-xs text-guc-gold/90 mt-1">Feedback: {m.reviewNotes}</div>}
                    </div>
                    <button className="btn" onClick={()=>startEdit(m)}>Edit</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* My Registrations */}
      {section === 'registrations' && (
        <div className="grid md:grid-cols-2 gap-4" id="registrations">
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">My Registrations — Upcoming</h3>
              <div className="text-sm">Wallet: <span className="font-medium text-emerald-400">${walletBalance.toFixed(2)}</span></div>
            </div>
            <ul className="space-y-2">
              {regsUpcoming.map(r => {
                const price = r.priceSnapshot ?? r.event?.tripDetails?.price ?? r.event?.workshopDetails?.price ?? r.event?.price ?? 0
                const isPaid = r.paymentStatus === 'PAID'
                const isPending = r.paymentStatus === 'PENDING'
                const needsPayment = price > 0 && !isPaid
                const startAt = r.event?.startAt ? new Date(r.event.startAt) : null
                const msRemaining = startAt ? (startAt.getTime() - Date.now()) : 0
                const daysRemaining = msRemaining / (24*60*60*1000)
                const canCancel = isPaid && r.status !== 'CANCELLED' && startAt && daysRemaining >= 14
                const processingCard = isPending && ['STRIPE','MIXED'].includes(r.paymentMethod) && (r.stripePaymentIntentId || r.mixedPaymentIntentId || r.stripeCheckoutSessionId)
                return (
                  <li key={r._id} className="card">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-medium">{r.event?.title}</div>
                        <div className="text-xs text-white/60">{new Date(r.event?.startAt).toLocaleString()}</div>
                        {price > 0 && (
                          <div className="text-xs mt-1">
                            <span className="text-white/70">Price: ${price.toFixed(2)}</span>
                            {isPaid && <span className="ml-2 text-emerald-400">✓ Paid</span>}
                            {processingCard && <span className="ml-2 text-cyan-400">Paid (processing)</span>}
                            {!isPaid && !processingCard && isPending && <span className="ml-2 text-yellow-400">⏳ Pending</span>}
                            {!isPaid && !isPending && <span className="ml-2 text-red-400">Unpaid</span>}
                          </div>
                        )}
                        {canCancel ? (
                          <div className="text-[10px] mt-1 text-white/50">You can cancel (≥14 days remaining)</div>
                        ) : (
                          <div className="text-[10px] mt-1 text-white/30">Cancellation window passed</div>
                        )}
                      </div>
                      {needsPayment && !processingCard && (
                        <button onClick={() => setPaymentReg(r)} className="btn btn-sm bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-1">Pay</button>
                      )}
                      {canCancel && (
                        <button onClick={() => cancelRegistration(r)} className="btn btn-sm bg-red-600 hover:bg-red-500 text-xs px-3 py-1 ml-2">Cancel</button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
            <h3 className="font-semibold mt-4 mb-2">Past</h3>
            <ul className="space-y-2">
              {regsPast.map(r => (
                <li key={r._id} className="card">
                  <div className="font-medium">{r.event?.title}</div>
                  <div className="text-xs text-white/60">{new Date(r.event?.startAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <RegisterDialog open={dlgOpen} event={dlgEvent} onConfirm={(id)=>{ register(id); closeRegisterDialog() }} onClose={closeRegisterDialog} />
      {paymentReg && (
        <PaymentDialog
          registrationId={paymentReg._id}
          price={paymentReg.priceSnapshot ?? paymentReg.event?.tripDetails?.price ?? paymentReg.event?.workshopDetails?.price ?? paymentReg.event?.price ?? 0}
          walletBalance={walletBalance}
          onPaid={() => { loadRegs(); loadWallet(); setPaymentReg(null); }}
          onClose={() => setPaymentReg(null)}
        />
      )}
    </div>
  )
}