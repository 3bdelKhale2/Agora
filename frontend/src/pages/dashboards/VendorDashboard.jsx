import React, { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../utils/api'
import toast from 'react-hot-toast'

export default function VendorDashboard(){
  const [bazaars, setBazaars] = useState([])
  const [acceptedUpcoming, setAcceptedUpcoming] = useState([])
  const [pendingRejectedUpcoming, setPendingRejectedUpcoming] = useState([])
  const [vendorProfile, setVendorProfile] = useState(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  // view filter & anchors
  const [sectionFilter, setSectionFilter] = useState(null) // null = show all, 'accepted' | 'requests' | 'apply' | 'bazaars'
  const applyRef = useRef(null)
  const bazaarsRef = useRef(null)
  const acceptedRef = useRef(null)
  const requestsRef = useRef(null)
  const location = useLocation()

  // Minimal vendor profile form (companyName required)
  const [companyName, setCompanyName] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')

  // Booth setup form
  const [boothSize, setBoothSize] = useState('2x2')
  const [durationWeeks, setDurationWeeks] = useState(1)
  const [mapLocationId, setMapLocationId] = useState('')
  const [attendees, setAttendees] = useState([{ name: '', email: '' }])
  const maxAttendees = 5

  // Bazaar application modal state
  const [bazaarModalOpen, setBazaarModalOpen] = useState(false)
  const [selectedBazaar, setSelectedBazaar] = useState(null)
  const [bazaarBoothSize, setBazaarBoothSize] = useState('2x2')
  const [bazaarAttendees, setBazaarAttendees] = useState([{ name: '', email: '' }])

  // Format event schedule: show day and time (not application/rejection dates)
  const formatDayTimeRange = (start, end) => {
    try {
      const s = new Date(start)
      const e = new Date(end)
      const sameDay = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()
      const dayFmt = { weekday: 'short', month: 'short', day: 'numeric' }
      const timeFmt = { hour: 'numeric', minute: '2-digit' }
      if (sameDay) {
        return `${s.toLocaleDateString(undefined, dayFmt)} • ${s.toLocaleTimeString(undefined, timeFmt)} — ${e.toLocaleTimeString(undefined, timeFmt)}`
      }
      return `${s.toLocaleDateString(undefined, dayFmt)} ${s.toLocaleTimeString(undefined, timeFmt)} — ${e.toLocaleDateString(undefined, dayFmt)} ${e.toLocaleTimeString(undefined, timeFmt)}`
    } catch {
      return ''
    }
  }

  const load = async () => {
    const ev = await api.get('/events', { params: { type: 'BAZAAR', status: 'PUBLISHED' } })
    setBazaars(ev.data.data || [])
    // load my vendor profile (if any)
    try {
      const vp = await api.get('/vendor-profiles/me')
      setVendorProfile(vp.data)
      setNeedsProfile(false)
      // prefill form with existing
      setCompanyName(vp.data.companyName || '')
      setPhone(vp.data.phone || '')
      setWebsite(vp.data.website || '')
      setAddress(vp.data.address || '')
    } catch (e) {
      if (e?.response?.status === 404) {
        setNeedsProfile(true)
      } else {
        toast.error(e?.response?.data?.error || 'Failed to load vendor profile')
      }
    }
    try {
      const req = await api.get('/vendor-participations', { params: { upcomingOnly: 1 } })
      const list = req.data || []
      const acc = list.filter(r => r.status === 'ACCEPTED')
      const pr = list.filter(r => r.status === 'PENDING' || r.status === 'REJECTED')
      setAcceptedUpcoming(acc)
      setPendingRejectedUpcoming(pr)
    } catch (e) {
      if (e?.response?.status === 404 && e?.response?.data?.error?.includes('Vendor profile not found')) {
        // If no profile, there are no requests yet
        setAcceptedUpcoming([])
        setPendingRejectedUpcoming([])
      } else {
        // Silently ignore to avoid noisy toasts on initial load
        setAcceptedUpcoming([])
        setPendingRejectedUpcoming([])
      }
    }
  }
  useEffect(()=>{ load() }, [])

  const goto = (key) => {
    setSectionFilter(key)
    const refMap = {
      apply: applyRef,
      bazaars: bazaarsRef,
      accepted: acceptedRef,
      requests: requestsRef,
    }
    const r = refMap[key]
    // Allow DOM to update filter first
    setTimeout(() => r?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  // When navigating with URL hash (from sidebar), filter and scroll to section
  useEffect(() => {
    const hash = (location.hash || '').replace('#','')
    const allowed = ['apply','bazaars','accepted','requests']
    if (allowed.includes(hash)) {
      setSectionFilter(hash)
      const refMap = { apply: applyRef, bazaars: bazaarsRef, accepted: acceptedRef, requests: requestsRef }
      setTimeout(() => refMap[hash]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [location.hash])

  const saveProfile = async (e) => {
    e?.preventDefault?.()
    if (!companyName.trim()) {
      return toast.error('Company Name is required')
    }
    try {
      const res = await api.put('/vendor-profiles/me', {
        companyName: companyName.trim(),
        phone: phone || undefined,
        website: website || undefined,
        address: address || undefined,
      })
      setVendorProfile(res.data)
      setNeedsProfile(false)
      toast.success('Vendor profile saved')
      // refresh requests/bazaars in case actions were blocked
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to save profile')
    }
  }

  const applyBazaar = async (eventId, boothSizeParam, attendeesParam) => {
    try {
      if (needsProfile) {
        return toast.error('Please complete your vendor profile first')
      }
      // Ensure at least one attendee
      const filled = (attendeesParam || attendees).filter(a=>a.name && a.email)
      if (filled.length === 0) {
        return toast.error('Add at least one attendee for the booth')
      }
      await api.post('/vendor-participations/bazaar', {
        event: eventId,
        boothSize: boothSizeParam || boothSize,
        attendees: filled
      })
      toast.success('Applied to bazaar'); load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed')
    }
  }

  // Open bazaar application modal
  const openBazaarApply = (b) => {
    if (needsProfile) {
      toast.error('Please complete your vendor profile first')
      return
    }
    setSelectedBazaar(b)
    setBazaarBoothSize('2x2')
    setBazaarAttendees([{ name: '', email: '' }])
    setBazaarModalOpen(true)
  }

  const updateBazaarAttendee = (i, key, val) => {
    setBazaarAttendees(arr => arr.map((a, idx) => idx===i ? { ...a, [key]: val } : a))
  }
  const addBazaarAttendee = () => {
    setBazaarAttendees(arr => arr.length < maxAttendees ? [...arr, { name: '', email: '' }] : arr)
  }
  const removeBazaarAttendee = (i) => {
    setBazaarAttendees(arr => arr.filter((_, idx) => idx !== i))
  }

  const submitBazaarApply = async () => {
    if (!selectedBazaar) return
    await applyBazaar(selectedBazaar._id, bazaarBoothSize, bazaarAttendees)
    setBazaarModalOpen(false)
    setSelectedBazaar(null)
  }

  const applyBoothSetup = async (e) => {
    e.preventDefault()
    try {
      if (needsProfile) {
        return toast.error('Please complete your vendor profile first')
      }
      const filled = attendees.filter(a=>a.name && a.email)
      if (filled.length === 0) return toast.error('Add at least one attendee')
      await api.post('/vendor-participations/booth-setup', {
        boothSize,
        durationWeeks,
        mapLocationId,
        attendees: filled,
      })
      toast.success('Booth setup request submitted')
      setMapLocationId('')
      setDurationWeeks(1)
      setBoothSize('2x2')
      setAttendees([{ name: '', email: '' }])
      load()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed')
    }
  }

  const updateAttendee = (i, key, val) => {
    setAttendees(arr => arr.map((a, idx) => idx===i ? { ...a, [key]: val } : a))
  }
  const addAttendee = () => {
    setAttendees(arr => arr.length < maxAttendees ? [...arr, { name: '', email: '' }] : arr)
  }
  const removeAttendee = (i) => {
    setAttendees(arr => arr.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Vendor</h2>


      {sectionFilter !== null && needsProfile && (
        <div className="card border border-yellow-600/30 bg-yellow-900/10">
          <h3 className="font-semibold mb-2">Complete your Vendor Profile</h3>
          <p className="text-sm opacity-80 mb-3">Create your vendor profile once to apply for bazaars or booth setup.</p>
          <form onSubmit={saveProfile} className="grid md:grid-cols-2 gap-3">
            <input className="glass-input md:col-span-2" placeholder="Company Name *" value={companyName} onChange={e=>setCompanyName(e.target.value)} required />
            <input className="glass-input" placeholder="Phone" value={phone} onChange={e=>setPhone(e.target.value)} />
            <input className="glass-input" placeholder="Website" value={website} onChange={e=>setWebsite(e.target.value)} />
            <input className="glass-input md:col-span-2" placeholder="Address" value={address} onChange={e=>setAddress(e.target.value)} />
            <div className="md:col-span-2 flex gap-2">
              <button type="submit" className="btn btn-primary">Save Profile</button>
            </div>
          </form>
        </div>
      )}

      {(sectionFilter==='apply') && (
      <div className="card" ref={applyRef} id="apply-section">
        <h3 className="font-semibold mb-2">Apply for Campus Booth Setup</h3>
        <form onSubmit={applyBoothSetup} className="grid md:grid-cols-3 gap-3">
          <select className="glass-input" value={boothSize} onChange={e=>setBoothSize(e.target.value)}>
            <option value="2x2">2x2</option>
            <option value="4x4">4x4</option>
          </select>
          <input className="glass-input" type="number" min={1} max={4} value={durationWeeks} onChange={e=>setDurationWeeks(parseInt(e.target.value||'1',10))} placeholder="Duration (weeks)" />
          <input className="glass-input" placeholder="Map Location ID" value={mapLocationId} onChange={e=>setMapLocationId(e.target.value)} required />

          <div className="md:col-span-3">
            <div className="text-sm opacity-90 mb-2">Attendees (max 5)</div>
            <div className="space-y-2">
              {attendees.map((a, i) => (
                <div key={i} className="grid md:grid-cols-3 gap-2 items-center">
                  <input className="glass-input" placeholder="Name" value={a.name} onChange={e=>updateAttendee(i,'name',e.target.value)} />
                  <input className="glass-input" placeholder="Email" type="email" value={a.email} onChange={e=>updateAttendee(i,'email',e.target.value)} />
                  <button type="button" className="btn bg-red-600 hover:bg-red-700 text-white" onClick={()=>removeAttendee(i)}>Remove</button>
                </div>
              ))}
              {attendees.length < maxAttendees && (
                <button type="button" className="btn" onClick={addAttendee}>Add attendee</button>
              )}
            </div>
          </div>
          <button className="btn btn-primary md:col-span-3">Submit Booth Setup Request</button>
        </form>
      </div>
      )}

      {(sectionFilter==='bazaars') && (
      <div ref={bazaarsRef} id="bazaars-section">
        <h3 className="font-semibold mb-2">Available Bazaars</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {bazaars.map(b => (
            <div key={b._id} className="card">
              <div className="font-medium">{b.title}</div>
              <div className="text-xs text-white/60">{formatDayTimeRange(b.startAt, b.endAt)}</div>
              <div className="mt-3">
                <button className="btn btn-primary" onClick={()=>openBazaarApply(b)}>Apply</button>
              </div>
            </div>
          ))}
        </div>
        {bazaarModalOpen && selectedBazaar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="card w-full max-w-2xl">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">Apply to {selectedBazaar.title}</div>
                  <div className="text-xs text-white/60">{formatDayTimeRange(selectedBazaar.startAt, selectedBazaar.endAt)}</div>
                </div>
                <button className="btn" onClick={()=>{setBazaarModalOpen(false); setSelectedBazaar(null)}}>Close</button>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Booth Size</label>
                  <select className="glass-input" value={bazaarBoothSize} onChange={e=>setBazaarBoothSize(e.target.value)}>
                    <option value="2x2">2x2</option>
                    <option value="4x4">4x4</option>
                  </select>
                </div>
                <div className="md:col-span-2 mt-2">
                  <div className="text-sm opacity-90 mb-2">Attendees (max {maxAttendees})</div>
                  <div className="space-y-2">
                    {bazaarAttendees.map((a, i) => (
                      <div key={i} className="grid md:grid-cols-3 gap-2 items-center">
                        <input className="glass-input" placeholder="Name" value={a.name} onChange={e=>updateBazaarAttendee(i,'name',e.target.value)} />
                        <input className="glass-input" placeholder="Email" type="email" value={a.email} onChange={e=>updateBazaarAttendee(i,'email',e.target.value)} />
                        <button type="button" className="btn bg-red-600 hover:bg-red-700 text-white" onClick={()=>removeBazaarAttendee(i)}>Remove</button>
                      </div>
                    ))}
                    {bazaarAttendees.length < maxAttendees && (
                      <button type="button" className="btn" onClick={addBazaarAttendee}>Add attendee</button>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="btn" onClick={()=>{setBazaarModalOpen(false); setSelectedBazaar(null)}}>Cancel</button>
                <button className="btn btn-primary" onClick={submitBazaarApply}>Submit Application</button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {(sectionFilter==='accepted') && (
      <div ref={acceptedRef} id="accepted-section">
        <h3 className="font-semibold mb-2">Upcoming Participations (Accepted)</h3>
        {acceptedUpcoming.length === 0 ? (
          <div className="text-sm opacity-70">No accepted upcoming participations yet.</div>
        ) : (
          <ul className="space-y-2">
            {acceptedUpcoming.map(r => (
              <li key={r._id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.event ? r.event.title : 'Booth Setup'}</div>
                  {r.event && (
                    <div className="text-xs text-white/60">{formatDayTimeRange(r.event.startAt, r.event.endAt)}</div>
                  )}
                  {r.mapLocationId && <div className="text-xs text-white/60">Location: {r.mapLocationId}</div>}
                </div>
                <div className="text-xs opacity-70">{r.event ? 'Bazaar' : 'Booth'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {(sectionFilter==='requests') && (
      <div ref={requestsRef} id="requests-section">
        <h3 className="font-semibold mb-2">My Requests (Pending/Rejected, Upcoming)</h3>
        {pendingRejectedUpcoming.length === 0 ? (
          <div className="text-sm opacity-70">No pending or rejected upcoming requests.</div>
        ) : (
          <ul className="space-y-2">
            {pendingRejectedUpcoming.map(r => (
              <li key={r._id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium">{r.event ? r.event.title : 'Booth Setup'}</div>
                  {r.event && (
                    <div className="text-xs text-white/60">{formatDayTimeRange(r.event.startAt, r.event.endAt)}</div>
                  )}
                  {r.mapLocationId && <div className="text-xs text-white/60">Location: {r.mapLocationId}</div>}
                  {r.status === 'REJECTED' && r.rejectionReason && (
                    <div className="text-xs mt-1 text-red-300">
                      Reason: {r.rejectionReason}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={
                      "px-2 py-0.5 rounded-full border " +
                      (r.status === 'REJECTED'
                        ? 'bg-red-800/60 text-red-100 border-red-500/40'
                        : 'bg-yellow-800/60 text-yellow-100 border-yellow-500/40')
                    }
                    title={`Status: ${r.status}`}
                  >
                    {r.status}
                  </span>
                  <span className="opacity-70">{r.event ? 'Bazaar' : 'Booth'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}
      {sectionFilter === null && (
        <div className="text-sm opacity-70">Select an option from the Vendor menu to get started.</div>
      )}
    </div>
  )
}