import React, { useEffect, useState } from 'react'
import { api } from '../../utils/api'
import EventCard from '../../components/EventCard.jsx'
import RegisterDialog from '../../components/RegisterDialog.jsx'
import PaymentDialog from '../../components/PaymentDialog.jsx'
import AnimatedButton from '../../components/AnimatedButton.jsx'
import toast from 'react-hot-toast'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function TADashboard(){
  const [events, setEvents] = useState([])
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [professorName, setProfessorName] = useState('')
  const [regsUpcoming, setRegsUpcoming] = useState([])
  const [regsPast, setRegsPast] = useState([])
  const [gyms, setGyms] = useState([])
  const [dlgOpen, setDlgOpen] = useState(false)
  const [dlgEvent, setDlgEvent] = useState(null)
  const [paymentReg, setPaymentReg] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const { user } = useAuth()

  const location = useLocation()
  const navigate = useNavigate()

  const section = location.pathname.includes('/registrations')
    ? 'regs'
    : location.pathname.includes('/gyms')
      ? 'gyms'
      : 'browse'

  const loadEvents = async () => {
    try {
      const params = { status: 'PUBLISHED' }
      if (q) params.q = q
      if (type) params.type = type
      if (professorName) params.professorName = professorName
      const res = await api.get('/events', { params })
      setEvents(res.data.data || [])
    } catch {}
  }
  const regByEvent = {}
  regsUpcoming.forEach(r => { if (r.event?._id) regByEvent[r.event._id] = r })
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

  useEffect(()=>{ loadEvents(); loadRegs(); loadGyms(); loadWallet(); }, [])

  // Redirect bare /ta-dashboard to default section
  useEffect(() => {
    if (location.pathname === '/ta-dashboard') {
      navigate('/ta-dashboard/browse', { replace: true })
    }
  }, [location.pathname, navigate])

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
      navigate('/ta-dashboard/registrations')
      loadRegs(); loadWallet()
    } catch (e) { toast.error(e?.response?.data?.error || 'Failed') }
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
      <h2 className="text-2xl font-semibold">TA Dashboard</h2>

      {/* Browse Events */}
      {section === 'browse' && (
        <div className="card">
          <h3 className="font-semibold">Browse Events</h3>
          <div className="grid md:grid-cols-4 gap-2 mt-3">
            <input className="glass-input" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="glass-input" value={type} onChange={e=>setType(e.target.value)}>
              <option value="">All Types</option>
              <option value="WORKSHOP">WORKSHOP</option>
              <option value="TRIP">TRIP</option>
              <option value="CONFERENCE">CONFERENCE</option>
              <option value="BAZAAR">BAZAAR</option>
              <option value="GYM_SESSION">GYM_SESSION</option>
            </select>
            <input className="glass-input" placeholder="Professor name" value={professorName} onChange={e=>setProfessorName(e.target.value)} />
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
                    // Do not allow paying directly from browse; guide user to My Registrations
                    action = <div className="mt-3 text-xs text-yellow-400">Pending payment (see My Registrations)</div>
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
        </div>
      )}

      {/* My Registrations */}
      {section === 'regs' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Upcoming</h3>
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
              {regsUpcoming.length === 0 && (
                <li className="text-sm text-white/70">No upcoming registrations.</li>
              )}
            </ul>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-2">Past</h3>
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

      {/* Gym Sessions */}
      {section === 'gyms' && (
        <div className="card">
          <h3 className="font-semibold mb-2">Gym Sessions</h3>
          <ul className="space-y-2">
            {gyms.map(g => (
              <li key={g._id} className="card">
                <div className="font-medium">{g.title}</div>
                <div className="text-xs text-white/60">{new Date(g.startAt).toLocaleString()} — {new Date(g.endAt).toLocaleString()}</div>
                <div className="text-xs text-white/70 mt-1">
                  Type: {g.gymDetails?.sessionType || '-'} • Duration: {g.gymDetails?.durationMinutes ?? '-'} mins • Max: {g.gymDetails?.maxParticipants ?? '-'}
                </div>
              </li>
            ))}
            {gyms.length === 0 && (
              <li className="text-sm text-white/70">No gym sessions found.</li>
            )}
          </ul>
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