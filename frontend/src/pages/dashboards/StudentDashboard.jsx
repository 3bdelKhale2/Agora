import React, { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import EventCard from '../../components/EventCard.jsx'
import RegisterDialog from '../../components/RegisterDialog.jsx'
import PaymentDialog from '../../components/PaymentDialog.jsx'
import AnimatedButton from '../../components/AnimatedButton.jsx'
import toast from 'react-hot-toast'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function StudentDashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [professorName, setProfessorName] = useState('')

  const [regsUpcoming, setRegsUpcoming] = useState([])
  const [regsPast, setRegsPast] = useState([])
  const [gyms, setGyms] = useState([])

  // Courts availability
  const [availGroups, setAvailGroups] = useState([]) // [{ court: {...}, slots: [...] }]
  const [sportFilter, setSportFilter] = useState('') // '', 'BASKETBALL','TENNIS','FOOTBALL'
  const [daysRange, setDaysRange] = useState(7)
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  const [dlgOpen, setDlgOpen] = useState(false)
  const [dlgEvent, setDlgEvent] = useState(null)
  const [paymentReg, setPaymentReg] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const { user } = useAuth()

  const location = useLocation()
  const hash = (location.hash || '').replace('#','')
  const section = ['browse','registrations','gyms','courts'].includes(hash) ? hash : 'browse'

  const loadEvents = async () => {
    try {
      const params = { status: 'PUBLISHED' }
      if (q) params.q = q
      if (type) params.type = type
      if (professorName) params.professorName = professorName
      const res = await api.get('/events', { params })
      setEvents(res.data.data || [])
    } catch (e) { /* ignore */ }
    setLoading(false)
  }

  // Map of eventId -> registration (pending or registered)
  const regByEvent = {}
  regsUpcoming.forEach(r => { if (r.event?._id) regByEvent[r.event._id] = r })
  // Past regs could also be considered, but we only need upcoming for hiding Register button

  const loadAvailability = async () => {
    try {
      const now = new Date()
      const to = new Date(now.getTime() + Number(daysRange) * 24 * 60 * 60 * 1000)
      const params = { from: now.toISOString(), to: to.toISOString() }
      if (sportFilter) params.sport = sportFilter
      if (onlyAvailable) params.onlyAvailable = 1
      const res = await api.get('/courts/availability', { params })
      setAvailGroups(res.data?.data || [])
    } catch {
      setAvailGroups([])
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

  const loadGyms = async () => {
    try {
      const res = await api.get('/events', { params: { type: 'GYM_SESSION', status: 'PUBLISHED', limit: 50 } })
      setGyms(res.data.data || [])
    } catch {}
  }

  const loadWallet = async () => {
    try {
      const res = await api.get('/users/me')
      setWalletBalance(res.data?.walletBalance ?? 0)
    } catch {}
  }

  useEffect(() => { loadEvents(); loadRegs(); loadGyms(); loadAvailability(); loadWallet(); }, [])
  useEffect(() => { loadAvailability() }, [sportFilter, daysRange, onlyAvailable])

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
          toast.success('Registered! Go to My Registrations to complete payment')
          window.location.hash = 'registrations'
        } else {
          toast.success('Registered')
        }
      } else {
        toast.success('Registered')
      }
      loadRegs(); loadWallet()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to register')
    }
  }
  const cancelRegistration = async (reg) => {
    try {
      const id = reg._id
      await api.delete(`/registrations/${id}`)
      toast.success('Registration cancelled')
      loadRegs(); loadWallet()
    } catch (e) {
      const msg = e?.response?.data?.error || 'Cancellation failed'
      toast.error(msg)
    }
  }
  const openRegisterDialog = (ev) => { setDlgEvent(ev); setDlgOpen(true) }
  const closeRegisterDialog = () => { setDlgOpen(false); setDlgEvent(null) }

  if (loading) return null
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Student Dashboard</h2>

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
                <EventCard key={ev._id} event={ev} action={action} />
              )
            })}
          </div>
        </div>
      )}

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
                        <button
                          onClick={() => cancelRegistration(r)}
                          className="btn btn-sm bg-red-600 hover:bg-red-500 text-xs px-3 py-1 ml-2"
                        >Cancel</button>
                      )}
                    </div>
                  </li>
                )
              })}
              {regsUpcoming.length === 0 && (
                <li className="text-sm text-white/70">No upcoming registrations.</li>
              )}
            </ul>
            <h3 className="font-semibold mt-4 mb-2">Past</h3>
            <ul className="space-y-2">
              {regsPast.map(r => (
                <li key={r._id} className="card">
                  <div className="font-medium">{r.event?.title}</div>
                  <div className="text-xs text-white/60">{new Date(r.event?.startAt).toLocaleString()}</div>
                </li>
              ))}
              {regsPast.length === 0 && (
                <li className="text-sm text-white/70">No past registrations.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {section === 'gyms' && (
        <div className="card" id="gyms">
          <h3 className="font-semibold mb-2">Gym Sessions</h3>
          <ul className="space-y-2">
            {gyms.map(g => (
              <li key={g._id} className="card">
                <div className="font-medium">{g.title}</div>
                <div className="text-xs text-white/60">{new Date(g.startAt).toLocaleString()} — {new Date(g.endAt).toLocaleString()}</div>
              </li>
            ))}
            {gyms.length === 0 && (
              <li className="text-sm text-white/70">No gym sessions found.</li>
            )}
          </ul>
        </div>
      )}

      {section === 'courts' && (
        <div className="card" id="courts">
          <h3 className="font-semibold mb-2">Courts & Availability</h3>
          <div className="grid md:grid-cols-4 gap-2 items-center">
            <select className="glass-input" value={sportFilter} onChange={e=>setSportFilter(e.target.value)}>
              <option value="">All Sports</option>
              <option value="BASKETBALL">Basketball</option>
              <option value="TENNIS">Tennis</option>
              <option value="FOOTBALL">Football</option>
            </select>
            <select className="glass-input" value={daysRange} onChange={e=>setDaysRange(Number(e.target.value))}>
              {[3,7,14,30].map(d => <option key={d} value={d}>Next {d} days</option>)}
            </select>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyAvailable} onChange={e=>setOnlyAvailable(e.target.checked)} /> Only available</label>
            <AnimatedButton onClick={loadAvailability}>Refresh</AnimatedButton>
          </div>
          <div className="mt-3 space-y-2">
            {availGroups.map(g => (
              <div key={g.court._id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{g.court.name}</div>
                    <div className="text-xs text-white/70">{g.court.sport}{g.court.location ? ` • ${g.court.location}` : ''}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <ul className="space-y-1">
                    {(g.slots || []).map(s => (
                      <li key={s._id} className="flex items-center justify-between text-sm">
                        <span>{new Date(s.startAt).toLocaleString()} — {new Date(s.endAt).toLocaleString()}</span>
                        <span className={`text-xs px-2 py-1 rounded ${s.isBooked ? 'bg-red-500/30' : 'bg-green-500/30'}`}>{s.isBooked ? 'Booked' : 'Available'}</span>
                      </li>
                    ))}
                    {Array.isArray(g.slots) && g.slots.length === 0 && (
                      <li className="text-xs opacity-70">No slots in selected range.</li>
                    )}
                  </ul>
                </div>
              </div>
            ))}
            {availGroups.length === 0 && (
              <div className="text-sm opacity-70">No courts found for the selected filters.</div>
            )}
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