import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../utils/api'
import toast from 'react-hot-toast'
import ProposeEditsDialog from '../../components/ProposeEditsDialog.jsx'
import PromptModal from '../../components/PromptModal.jsx'

export default function EventOfficeDashboard(){
  // Section filter & anchors (like Vendor dashboard)
  const [sectionFilter, setSectionFilter] = useState(null) // 'create' | 'workshops' | 'vendors' | 'events'
  const createRef = useRef(null)
  const workshopsRef = useRef(null)
  const vendorsRef = useRef(null)
  const eventsRef = useRef(null)
  const location = useLocation()
  // Create forms
  const [title, setTitle] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [activeType, setActiveType] = useState('TRIP') // TRIP | BAZAAR | CONFERENCE | GYM_SESSION

  // Trip-specific fields
  const [tripLocation, setTripLocation] = useState('GUC_CAIRO')
  const [tripPrice, setTripPrice] = useState('')
  const [tripShortDesc, setTripShortDesc] = useState('')
  const [tripCapacity, setTripCapacity] = useState('')
  const [tripRegDeadline, setTripRegDeadline] = useState('')

  // Bazaar-specific fields
  const [bazaarLocation, setBazaarLocation] = useState('GUC_CAIRO')
  const [bazaarShortDesc, setBazaarShortDesc] = useState('')
  const [bazaarRegDeadline, setBazaarRegDeadline] = useState('')
  const [bazaarAllowsVendors, setBazaarAllowsVendors] = useState(true)

  // Conference-specific fields
  const [confShortDesc, setConfShortDesc] = useState('')
  const [confFullAgenda, setConfFullAgenda] = useState('')
  const [confWebsite, setConfWebsite] = useState('')
  const [confRequiredBudget, setConfRequiredBudget] = useState('')
  const [confFundingSource, setConfFundingSource] = useState('GUC')
  const [confExtraResources, setConfExtraResources] = useState('')

  // Gym-specific fields
  const [gymType, setGymType] = useState('YOGA')
  const [gymDuration, setGymDuration] = useState('60') // minutes
  const [gymMaxParticipants, setGymMaxParticipants] = useState('20')
  const [gymLocation, setGymLocation] = useState('GUC_CAIRO')

  // Edit Trip state
  const [editTripId, setEditTripId] = useState(null)
  const [eTitle, setETitle] = useState('')
  const [eLocation, setELocation] = useState('')
  const [ePrice, setEPrice] = useState('')
  const [eShortDesc, setEShortDesc] = useState('')
  const [eCapacity, setECapacity] = useState('')
  const [eStartAt, setEStartAt] = useState('')
  const [eEndAt, setEEndAt] = useState('')
  const [eRegDeadline, setERegDeadline] = useState('')

  // Edit Bazaar state
  const [editBazaarId, setEditBazaarId] = useState(null)
  const [bTitle, setBTitle] = useState('')
  const [bLocation, setBLocation] = useState('')
  const [bShortDesc, setBShortDesc] = useState('')
  const [bStartAt, setBStartAt] = useState('')
  const [bEndAt, setBEndAt] = useState('')
  const [bRegDeadline, setBRegDeadline] = useState('')
  const [bAllowsVendors, setBAllowsVendors] = useState(true)

  // Edit Conference state
  const [editConferenceId, setEditConferenceId] = useState(null)
  const [cTitle, setCTitle] = useState('')
  const [cShortDesc, setCShortDesc] = useState('')
  const [cFullAgenda, setCFullAgenda] = useState('')
  const [cWebsite, setCWebsite] = useState('')
  const [cRequiredBudget, setCRequiredBudget] = useState('')
  const [cFundingSource, setCFundingSource] = useState('GUC')
  const [cExtraResources, setCExtraResources] = useState('')
  const [cStartAt, setCStartAt] = useState('')
  const [cEndAt, setCEndAt] = useState('')

  // Edit Workshop state (EO can directly apply changes)
  const [editWorkshopId, setEditWorkshopId] = useState(null)
  const [wTitle, setWTitle] = useState('')
  const [wLocation, setWLocation] = useState('GUC_CAIRO')
  const [wStartAt, setWStartAt] = useState('')
  const [wEndAt, setWEndAt] = useState('')
  const [wCapacity, setWCapacity] = useState('')
  const [wRegDeadline, setWRegDeadline] = useState('')
  const [wShortDesc, setWShortDesc] = useState('')
  const [wFullAgenda, setWFullAgenda] = useState('')
  const [wFaculty, setWFaculty] = useState('')
  const [wProfessors, setWProfessors] = useState('')
  const [wRequiredBudget, setWRequiredBudget] = useState('')
  const [wFundingSource, setWFundingSource] = useState('GUC')
  const [wExtraResources, setWExtraResources] = useState('')

  // Lists
  const [events, setEvents] = useState([])
  const [workshopsPending, setWorkshopsPending] = useState([])
  const [vendorReqs, setVendorReqs] = useState([])

  // Propose edits dialog state
  const [pdOpen, setPdOpen] = useState(false)
  const [pdEvent, setPdEvent] = useState(null)

  // Styled prompt/confirm modal state
  const [prompt, setPrompt] = useState({ open: false })

  // Filters/search
  const [filterQ, setFilterQ] = useState('')
  const [filterProfessor, setFilterProfessor] = useState('')
  const [filterType, setFilterType] = useState('')
  const [onlyUpcoming, setOnlyUpcoming] = useState(true)
  const [withVendors, setWithVendors] = useState(true)

  const resetForm = () => {
    setTitle(''); setStartAt(''); setEndAt('');
    setTripLocation('GUC_CAIRO'); setTripPrice(''); setTripShortDesc(''); setTripCapacity(''); setTripRegDeadline('')
    setBazaarLocation('GUC_CAIRO'); setBazaarShortDesc(''); setBazaarRegDeadline(''); setBazaarAllowsVendors(true)
    setConfShortDesc(''); setConfFullAgenda(''); setConfWebsite(''); setConfRequiredBudget(''); setConfFundingSource('GUC'); setConfExtraResources('')
    setGymType('YOGA'); setGymDuration('60'); setGymMaxParticipants('20'); setGymLocation('GUC_CAIRO')
  }

  // Helpers for date logic validation
  const asDate = (v) => {
    if (!v) return null
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const assertDateOrder = ({ start, end, reg, ctx }) => {
    // start < end
    const s = asDate(start)
    const e = asDate(end)
    if (!s || !e) return { ok: false, msg: `${ctx}: invalid start/end date` }
    if (s.getTime() >= e.getTime()) return { ok: false, msg: `${ctx}: End must be after Start` }
    const now = new Date()
    if (s.getTime() <= now.getTime()) return { ok: false, msg: `${ctx}: Start must be in the future` }
    if (reg) {
      const r = asDate(reg)
      if (!r) return { ok: false, msg: `${ctx}: invalid registration deadline` }
      if (r.getTime() >= s.getTime()) return { ok: false, msg: `${ctx}: Registration deadline must be before Start` }
      if (r.getTime() <= now.getTime()) return { ok: false, msg: `${ctx}: Registration deadline must be in the future` }
    }
    return { ok: true }
  }

  const toLocalInput = (d) => {
    if (!d) return ''
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ''
    const pad = (n) => String(n).padStart(2,'0')
    const y = dt.getFullYear()
    const m = pad(dt.getMonth()+1)
    const day = pad(dt.getDate())
    const h = pad(dt.getHours())
    const min = pad(dt.getMinutes())
    return `${y}-${m}-${day}T${h}:${min}`
  }

  const beginEditTrip = (ev) => {
    setEditTripId(ev._id)
    setETitle(ev.title || '')
    {
      const raw = ev.location || ev.tripDetails?.location || ''
      const loc = ['GUC_CAIRO','GUC_BERLIN'].includes(String(raw).toUpperCase()) ? String(raw).toUpperCase() : 'GUC_CAIRO'
      setELocation(loc)
    }
    setEPrice((ev.tripDetails?.price ?? '').toString())
    setEShortDesc(ev.tripDetails?.shortDescription || ev.description || '')
    setECapacity(((ev.tripDetails?.capacity ?? ev.capacity) ?? '').toString())
    setEStartAt(toLocalInput(ev.startAt))
    setEEndAt(toLocalInput(ev.endAt))
    setERegDeadline(toLocalInput(ev.tripDetails?.registrationDeadline ?? ev.registrationDeadline))
  }

  const cancelEditTrip = () => {
    setEditTripId(null)
    setETitle(''); setELocation(''); setEPrice(''); setEShortDesc(''); setECapacity(''); setEStartAt(''); setEEndAt(''); setERegDeadline('')
  }

  const beginEditBazaar = (ev) => {
    setEditBazaarId(ev._id)
    setBTitle(ev.title || '')
    {
      const raw = ev.location || ''
      const loc = ['GUC_CAIRO','GUC_BERLIN'].includes(String(raw).toUpperCase()) ? String(raw).toUpperCase() : 'GUC_CAIRO'
      setBLocation(loc)
    }
    setBShortDesc(ev.description || '')
    setBStartAt(toLocalInput(ev.startAt))
    setBEndAt(toLocalInput(ev.endAt))
    setBRegDeadline(toLocalInput(ev.bazaarDetails?.registrationDeadline ?? ev.registrationDeadline))
    setBAllowsVendors(Boolean(ev.bazaarDetails?.allowsVendors ?? true))
  }
  const cancelEditBazaar = () => {
    setEditBazaarId(null)
    setBTitle(''); setBLocation(''); setBShortDesc(''); setBStartAt(''); setBEndAt(''); setBRegDeadline(''); setBAllowsVendors(true)
  }
  const saveEditBazaar = async (e) => {
    e.preventDefault()
    if (!editBazaarId) return
    // Validate date logic
    const v = assertDateOrder({ start: bStartAt, end: bEndAt, reg: bRegDeadline, ctx: 'Bazaar' })
    if (!v.ok) return toast.error(v.msg)
    try {
      const payload = {
        title: bTitle,
        startAt: bStartAt,
        endAt: bEndAt,
        location: bLocation,
        description: bShortDesc,
        bazaarDetails: {
          registrationDeadline: bRegDeadline,
          allowsVendors: bAllowsVendors,
        }
      }
      await api.patch(`/events/${editBazaarId}`, payload)
      toast.success('Bazaar updated')
      cancelEditBazaar()
      await loadEvents()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    }
  }

  const beginEditConference = (ev) => {
    setEditConferenceId(ev._id)
    setCTitle(ev.title || '')
    setCShortDesc(ev.conferenceDetails?.shortDescription || ev.description || '')
    setCFullAgenda(ev.conferenceDetails?.fullAgenda || '')
    setCWebsite(ev.conferenceDetails?.website || '')
    setCRequiredBudget((ev.conferenceDetails?.requiredBudget ?? '').toString())
    setCFundingSource(ev.conferenceDetails?.fundingSource || 'GUC')
    setCExtraResources(ev.conferenceDetails?.extraResources || '')
    setCStartAt(toLocalInput(ev.startAt))
    setCEndAt(toLocalInput(ev.endAt))
  }
  const cancelEditConference = () => {
    setEditConferenceId(null)
    setCTitle(''); setCShortDesc(''); setCFullAgenda(''); setCWebsite(''); setCRequiredBudget(''); setCFundingSource('GUC'); setCExtraResources(''); setCStartAt(''); setCEndAt('')
  }

  const beginEditWorkshop = (ev) => {
    setEditWorkshopId(ev._id)
    setWTitle(ev.title || '')
    {
      const raw = ev.location || ''
      const loc = ['GUC_CAIRO','GUC_BERLIN'].includes(String(raw).toUpperCase()) ? String(raw).toUpperCase() : 'GUC_CAIRO'
      setWLocation(loc)
    }
    setWStartAt(toLocalInput(ev.startAt))
    setWEndAt(toLocalInput(ev.endAt))
    setWCapacity(((ev.capacity ?? '')).toString())
    setWRegDeadline(toLocalInput(ev.registrationDeadline))
    setWShortDesc(ev.shortDescription || ev.description || '')
    setWFullAgenda(ev.fullAgenda || '')
    setWFaculty(ev.faculty || '')
    setWProfessors(Array.isArray(ev.professors) ? ev.professors.join(', ') : '')
    setWRequiredBudget(((ev.requiredBudget ?? '')).toString())
    setWFundingSource(ev.fundingSource || 'GUC')
    setWExtraResources(ev.extraResources || '')
  }
  const cancelEditWorkshop = () => {
    setEditWorkshopId(null)
    setWTitle('')
    setWLocation('GUC_CAIRO')
    setWStartAt('')
    setWEndAt('')
    setWCapacity('')
    setWRegDeadline('')
    setWShortDesc('')
    setWFullAgenda('')
    setWFaculty('')
    setWProfessors('')
    setWRequiredBudget('')
    setWFundingSource('GUC')
    setWExtraResources('')
  }
  const saveEditWorkshop = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!editWorkshopId) return
    try {
      const payload = {
        title: wTitle,
        location: wLocation,
        startAt: wStartAt,
        endAt: wEndAt,
        capacity: Number(wCapacity),
        registrationDeadline: wRegDeadline,
        shortDescription: wShortDesc,
        fullAgenda: wFullAgenda || undefined,
        faculty: wFaculty,
        professors: (wProfessors || '').split(',').map(s=>s.trim()).filter(Boolean),
        requiredBudget: Number(wRequiredBudget),
        fundingSource: wFundingSource,
        extraResources: wExtraResources || undefined,
      }
      await api.patch(`/events/${editWorkshopId}`, payload)
      toast.success('Workshop updated')
      cancelEditWorkshop()
      await loadEvents()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    }
  }
  const saveAndPublishWorkshop = async () => {
    try {
      const id = editWorkshopId
      await saveEditWorkshop()
      if (!id) return
      // After saving, publish the event
      await api.patch(`/events/${id}/publish`)
      toast.success('Workshop published with changes')
      cancelEditWorkshop()
      await loadAll()
    } catch (err) {
      // saveEditWorkshop already toasts; ensure publish error shown
      if (err) toast.error(err?.response?.data?.error || 'Publish failed')
    }
  }
  const saveEditConference = async (e) => {
    e.preventDefault()
    if (!editConferenceId) return
    // Validate
    const v = assertDateOrder({ start: cStartAt, end: cEndAt, ctx: 'Conference' })
    if (!v.ok) return toast.error(v.msg)
    try {
      const payload = {
        title: cTitle,
        startAt: cStartAt,
        endAt: cEndAt,
        description: cShortDesc,
        conferenceDetails: {
          shortDescription: cShortDesc,
          fullAgenda: cFullAgenda || undefined,
          website: cWebsite,
          requiredBudget: Number(cRequiredBudget),
          fundingSource: cFundingSource,
          extraResources: cExtraResources || undefined,
        }
      }
      await api.patch(`/events/${editConferenceId}`, payload)
      toast.success('Conference updated')
      cancelEditConference()
      await loadEvents()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    }
  }

  const saveEditTrip = async (e) => {
    e.preventDefault()
    if (!editTripId) return
    // Validate
    const v = assertDateOrder({ start: eStartAt, end: eEndAt, reg: eRegDeadline, ctx: 'Trip' })
    if (!v.ok) return toast.error(v.msg)
    try {
      const payload = {
        title: eTitle,
        startAt: eStartAt,
        endAt: eEndAt,
        location: eLocation,
        registrationDeadline: eRegDeadline,
        capacity: Number(eCapacity),
        description: eShortDesc,
        tripDetails: {
          location: eLocation,
          price: Number(ePrice),
          shortDescription: eShortDesc,
          capacity: Number(eCapacity),
          registrationDeadline: eRegDeadline
        }
      }
      await api.patch(`/events/${editTripId}`, payload)
      toast.success('Trip updated')
      cancelEditTrip()
      await loadEvents()
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed')
    }
  }

  const loadEvents = async () => {
    const params = {}
    if (filterQ.trim()) params.q = filterQ.trim()
    if (filterProfessor.trim()) params.professorName = filterProfessor.trim()
    if (filterType) params.type = filterType
    if (onlyUpcoming) params.upcoming = 1
    if (withVendors) params.includeVendors = 1
    const res = await api.get('/events', { params })
    setEvents(res.data.data || [])
  }
  const loadWorkshopsForReview = async () => {
    const statuses = ['PENDING','NEEDS_EDITS','PUBLISHED']
    const results = await Promise.all(statuses.map(s => api.get('/events', { params: { type: 'WORKSHOP', status: s, limit: 50 } })))
    const merged = results.flatMap(r => r.data.data || [])
    setWorkshopsPending(merged)
  }
  const loadVendorReqs = async () => {
    const res = await api.get('/vendor-participations/all', { params: { status: 'PENDING', limit: 50 } })
    setVendorReqs(res.data.data || [])
  }

  const loadAll = async () => { await Promise.all([loadEvents(), loadWorkshopsForReview(), loadVendorReqs()]) }

  useEffect(()=>{ loadAll() }, [])

  // Map of eventId -> count of pending vendor requests (for bazaars)
  const pendingVendorByEvent = useMemo(() => {
    const m = new Map()
    for (const v of vendorReqs || []) {
      if (v && v.kind === 'BAZAAR' && v.status === 'PENDING' && v.event?._id) {
        const k = String(v.event._id)
        m.set(k, (m.get(k) || 0) + 1)
      }
    }
    return m
  }, [vendorReqs])

  useEffect(() => {
    const hash = (location.hash || '').replace('#','')
    const allowed = ['create','workshops','vendors','events']
    if (allowed.includes(hash)) {
      setSectionFilter(hash)
      const refMap = { create: createRef, workshops: workshopsRef, vendors: vendorsRef, events: eventsRef }
      setTimeout(() => refMap[hash]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } else {
      setSectionFilter(null)
    }
  }, [location.hash])

  const create = async (e) => {
    e.preventDefault()
    try {
  let payload = { title, startAt, endAt }
  let path = '/events'
      // Global validation for start/end first
      const common = assertDateOrder({ start: startAt, end: endAt, ctx: 'Event' })
      if (!common.ok) return toast.error(common.msg)
      if (activeType === 'TRIP') {
        path = '/events/trips'
        const tripV = assertDateOrder({ start: startAt, end: endAt, reg: tripRegDeadline, ctx: 'Trip' })
        if (!tripV.ok) return toast.error(tripV.msg)
        payload = {
          title,
          location: tripLocation,
          price: Number(tripPrice),
          startAt,
          endAt,
          shortDescription: tripShortDesc,
          capacity: Number(tripCapacity),
          registrationDeadline: tripRegDeadline,
        }
      } else if (activeType === 'BAZAAR') {
        path = '/events/bazaars'
        const bazV = assertDateOrder({ start: startAt, end: endAt, reg: bazaarRegDeadline, ctx: 'Bazaar' })
        if (!bazV.ok) return toast.error(bazV.msg)
        payload = {
          title,
          location: bazaarLocation,
          shortDescription: bazaarShortDesc,
          startAt,
          endAt,
          registrationDeadline: bazaarRegDeadline,
          allowsVendors: bazaarAllowsVendors,
        }
      } else if (activeType === 'CONFERENCE') {
        path = '/events/conferences'
        const confV = assertDateOrder({ start: startAt, end: endAt, ctx: 'Conference' })
        if (!confV.ok) return toast.error(confV.msg)
        payload = {
          title,
          startAt,
          endAt,
          shortDescription: confShortDesc,
          fullAgenda: confFullAgenda || undefined,
          website: confWebsite,
          requiredBudget: Number(confRequiredBudget),
          fundingSource: confFundingSource,
          extraResources: confExtraResources || undefined,
        }
      } else if (activeType === 'GYM_SESSION') {
        path = '/events/gym-sessions'
        // Auto-derive endAt from duration if possible
        let computedEnd = endAt
        if (startAt && Number(gymDuration) > 0) {
          const s = new Date(startAt)
          if (!Number.isNaN(s.getTime())) {
            const e = new Date(s.getTime() + Number(gymDuration) * 60 * 1000)
            // keep format acceptable by input/ISO; rely on input value if user set endAt
            computedEnd = e.toISOString()
          }
        }
        const gymV = assertDateOrder({ start: startAt, end: computedEnd || endAt, ctx: 'Gym Session' })
        if (!gymV.ok) return toast.error(gymV.msg)
        payload = {
          title,
          startAt,
          endAt: computedEnd || endAt,
          location: gymLocation,
          gymDetails: {
            sessionType: gymType,
            durationMinutes: Number(gymDuration),
            maxParticipants: Number(gymMaxParticipants),
          }
        }
      }
      await api.post(path, payload)
      toast.success(`${activeType} created (pending)`)
      resetForm(); loadAll()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to create')
    }
  }

  const publish = async (id) => {
    try { await api.patch(`/events/${id}/publish`); toast.success('Published'); loadAll() }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed') }
  }
  const reject = async (id) => {
    setPrompt({
      open: true,
      title: 'Reject Event',
      message: 'Optionally add a reason to send to the creator.',
      showInput: true,
      multiline: true,
      placeholder: 'Reason/notes (optional)',
      onConfirm: async (reason) => {
        try { await api.patch(`/events/${id}/reject`, { reviewNotes: reason || undefined }); toast.success('Rejected'); loadAll() }
        catch (e) { toast.error(e?.response?.data?.error || 'Failed') }
        finally { setPrompt({ open: false }) }
      },
      onClose: () => setPrompt({ open: false })
    })
  }
  const requestEdits = async (id) => {
    // For workshops, open chooser dialog to select fields; else fallback to note-only
    const ev = events.find(e => e._id === id)
    if (ev && ev.type === 'WORKSHOP') {
      setPdEvent(ev); setPdOpen(true); return
    }
    const reviewNotes = window.prompt('Request edits note (optional)') || undefined
    try { await api.patch(`/events/${id}/request-edits`, { reviewNotes }); toast.success('Moved to NEEDS_EDITS'); loadAll() }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed') }
  }

  const submitProposedEdits = async ({ proposedChanges, reviewNotes }) => {
    if (!pdEvent) return
    try {
      await api.patch(`/events/${pdEvent._id}/request-edits`, { proposedChanges, reviewNotes })
      toast.success('Requested edits sent')
      setPdOpen(false); setPdEvent(null)
      await loadAll()
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to send request')
    }
  }
  const cancelEvent = async (id) => {
    setPrompt({
      open: true,
      title: 'Cancel Event',
      message: 'Provide a cancellation reason (optional).',
      showInput: true,
      multiline: true,
      placeholder: 'Cancellation reason',
      onConfirm: async (reason) => {
        try { await api.patch(`/events/${id}/cancel`, { cancelledReason: reason || undefined }); toast.success('Cancelled'); loadAll() }
        catch (e) { toast.error(e?.response?.data?.error || 'Failed') }
        finally { setPrompt({ open: false }) }
      },
      onClose: () => setPrompt({ open: false })
    })
  }
  const del = async (id) => {
    setPrompt({
      open: true,
      title: 'Delete Event',
      message: 'Are you sure you want to delete this event? This cannot be undone.',
      onConfirm: async () => {
        try { await api.delete(`/events/${id}`); toast.success('Deleted'); loadAll() }
        catch (e) { toast.error(e?.response?.data?.error || 'Cannot delete') }
        finally { setPrompt({ open: false }) }
      },
      onClose: () => setPrompt({ open: false })
    })
  }

  const acceptVendor = async (id) => {
    try { await api.patch(`/vendor-participations/${id}/accept`); toast.success('Accepted'); loadVendorReqs() }
    catch (e) { toast.error(e?.response?.data?.error || 'Failed') }
  }
  const rejectVendor = async (id) => {
    setPrompt({
      open: true,
      title: 'Reject Vendor Request',
      message: 'Add a reason (optional).',
      showInput: true,
      multiline: true,
      placeholder: 'Reason (optional)',
      onConfirm: async (reason) => {
        try { await api.patch(`/vendor-participations/${id}/reject`, { reason: reason || undefined }); toast.success('Rejected'); loadVendorReqs() }
        catch (e) { toast.error(e?.response?.data?.error || 'Failed') }
        finally { setPrompt({ open: false }) }
      },
      onClose: () => setPrompt({ open: false })
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Events Office</h2>

      {sectionFilter==='create' && (
      <div className="card" ref={createRef} id="create-section">
        <div className="flex gap-2 mb-3">
          {['TRIP','BAZAAR','CONFERENCE','GYM_SESSION'].map(t => (
            <button key={t} className={`btn ${activeType===t ? 'btn-primary' : ''}`} onClick={()=>setActiveType(t)}>{t.replace('_',' ')}</button>
          ))}
        </div>
  <form onSubmit={create} className="grid md:grid-cols-3 gap-3">
          <input className="glass-input" placeholder={`${activeType} Title`} value={title} onChange={e=>setTitle(e.target.value)} required />
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">Start</span>
            <input aria-label="Start date and time" className="glass-input flex-1" type="datetime-local" min={new Date().toISOString().slice(0,16)} value={startAt} onChange={e=>setStartAt(e.target.value)} required />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm whitespace-nowrap">End</span>
            <input aria-label="End date and time" className="glass-input flex-1" type="datetime-local" min={(startAt||new Date().toISOString().slice(0,16))} value={endAt} onChange={e=>setEndAt(e.target.value)} required />
          </div>
          {activeType==='TRIP' && (
            <>
              <select className="glass-input" value={tripLocation} onChange={e=>setTripLocation(e.target.value)} required>
                <option value="" disabled>Select Trip Location</option>
                <option value="GUC_CAIRO">GUC_CAIRO</option>
                <option value="GUC_BERLIN">GUC_BERLIN</option>
              </select>
              <input className="glass-input" type="number" min="0" step="0.01" placeholder="Price" value={tripPrice} onChange={e=>setTripPrice(e.target.value)} required />
              <input className="glass-input" type="number" min="1" step="1" placeholder="Capacity" value={tripCapacity} onChange={e=>setTripCapacity(e.target.value)} required />
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">Registration deadline</span>
                <input aria-label="Registration deadline" className="glass-input flex-1" type="datetime-local" min={new Date().toISOString().slice(0,16)} placeholder="Registration Deadline" value={tripRegDeadline} onChange={e=>setTripRegDeadline(e.target.value)} required />
              </div>
              <textarea className="glass-input md:col-span-3" placeholder="Short Description" value={tripShortDesc} onChange={e=>setTripShortDesc(e.target.value)} required />
            </>
          )}
          {activeType==='BAZAAR' && (
            <>
              <select className="glass-input" value={bazaarLocation} onChange={e=>setBazaarLocation(e.target.value)} required>
                <option value="" disabled>Select Bazaar Location</option>
                <option value="GUC_CAIRO">GUC_CAIRO</option>
                <option value="GUC_BERLIN">GUC_BERLIN</option>
              </select>
              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm whitespace-nowrap">Registration deadline</span>
                  <input
                    aria-label="Registration deadline"
                    className="glass-input flex-1"
                    type="datetime-local"
                    min={new Date().toISOString().slice(0,16)}
                    placeholder="Registration Deadline"
                    value={bazaarRegDeadline}
                    onChange={e=>setBazaarRegDeadline(e.target.value)}
                    required
                  />
                </div>
                <label className="inline-flex items-center gap-2 whitespace-nowrap">
                  <input type="checkbox" checked={bazaarAllowsVendors} onChange={e=>setBazaarAllowsVendors(e.target.checked)} />
                  Allows Vendors
                </label>
              </div>
              <textarea className="glass-input md:col-span-3" placeholder="Short Description" value={bazaarShortDesc} onChange={e=>setBazaarShortDesc(e.target.value)} required />
            </>
          )}
          {activeType==='CONFERENCE' && (
            <>
              <textarea className="glass-input md:col-span-3" placeholder="Short Description" value={confShortDesc} onChange={e=>setConfShortDesc(e.target.value)} required />
              <textarea className="glass-input md:col-span-3" placeholder="Full Agenda (optional)" value={confFullAgenda} onChange={e=>setConfFullAgenda(e.target.value)} />
              <input className="glass-input" placeholder="Website (https://...)" value={confWebsite} onChange={e=>setConfWebsite(e.target.value)} required />
              <input className="glass-input" type="number" min="0" step="0.01" placeholder="Required Budget" value={confRequiredBudget} onChange={e=>setConfRequiredBudget(e.target.value)} required />
              <select className="glass-input" value={confFundingSource} onChange={e=>setConfFundingSource(e.target.value)}>
                {['GUC','EXTERNAL'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <textarea className="glass-input md:col-span-3" placeholder="Extra Resources (optional)" value={confExtraResources} onChange={e=>setConfExtraResources(e.target.value)} />
            </>
          )}
          {activeType==='GYM_SESSION' && (
            <>
              <select className="glass-input" value={gymLocation} onChange={e=>setGymLocation(e.target.value)} required>
                <option value="GUC_CAIRO">GUC_CAIRO</option>
                <option value="GUC_BERLIN">GUC_BERLIN</option>
              </select>
              <select className="glass-input" value={gymType} onChange={e=>setGymType(e.target.value)} required>
                {['YOGA','PILATES','AEROBICS','ZUMBA','CROSS_CIRCUIT','KICK_BOXING'].map(t=> (
                  <option key={t} value={t}>{t.replace('_',' ')}</option>
                ))}
              </select>
              <input className="glass-input" type="number" min="10" max="240" step="5" placeholder="Duration (minutes)" value={gymDuration} onChange={e=>setGymDuration(e.target.value)} required />
              <input className="glass-input" type="number" min="1" step="1" placeholder="Max participants" value={gymMaxParticipants} onChange={e=>setGymMaxParticipants(e.target.value)} required />
            </>
          )}
          <button className="btn btn-primary md:col-span-3">Create {activeType.replace('_',' ')}</button>
        </form>
  </div>
  )}

      {sectionFilter==='workshops' && (
      <div className="grid md:grid-cols-2 gap-4" ref={workshopsRef} id="workshops-section">
        <div className="card md:col-span-2">
          <h3 className="font-semibold mb-2">Professor Workshops — Review</h3>
          <ul className="space-y-2">
            {workshopsPending.map(e => (
              <li key={e._id} className="card flex items-center justify-between">
                <div>
                  <div className="font-semibold">{e.title}</div>
                  <div className="text-xs text-gray-300">Status: {e.status}</div>
                </div>
                <div className="flex gap-2">
                  {e.status!=='PUBLISHED' && (
                    <button className="btn btn-primary" onClick={()=>publish(e._id)}>Publish</button>
                  )}
                  <button className="btn" onClick={()=>requestEdits(e._id)}>Request Edits</button>
                  {e.status==='PUBLISHED' 
                    ? <button className="btn" onClick={()=>del(e._id)}>Delete</button>
                    : <button className="btn" onClick={()=>reject(e._id)}>Reject</button>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      )}

      {sectionFilter==='vendors' && (
      <div className="grid gap-4" ref={vendorsRef} id="vendors-section">
        <div className="card">
          <h3 className="font-semibold mb-2">Vendor Requests</h3>
          {vendorReqs.length === 0 ? (
            <div className="text-sm opacity-70">No pending vendor requests.</div>
          ) : (
            <ul className="space-y-2">
              {vendorReqs.map(v => (
                <li key={v._id} className="card flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">
                      {v.kind === 'BAZAAR' ? (v.event?.title || 'Bazaar') : 'Platform Booth Setup'}
                    </div>
                    <div className="text-xs text-gray-300">Kind: {v.kind} | Status: {v.status}</div>
                    {v.vendorProfile?.companyName && (
                      <div className="text-xs text-white/80 mt-1">Vendor: {v.vendorProfile.companyName}</div>
                    )}
                    <div className="text-xs text-white/70 mt-1">
                      Booth: {v.boothSize || '-'}
                      {v.kind === 'BOOTH_SETUP' && (
                        <> • Weeks: {v.durationWeeks ?? '-'} • Location: {v.mapLocationId || '-'}</>
                      )}
                    </div>
                    {Array.isArray(v.attendees) && v.attendees.length > 0 && (
                      <div className="text-xs text-white/70 mt-1">
                        Attendees: {v.attendees.map(a => a?.name).filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={()=>acceptVendor(v._id)}>Accept</button>
                    <button className="btn" onClick={()=>rejectVendor(v._id)}>Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      )}

      {sectionFilter==='events' && (
      <>
      <div className="card" ref={eventsRef} id="events-section">
        <div className="mb-3 grid md:grid-cols-5 gap-3">
          <input className="glass-input" placeholder="Search by Event name" value={filterQ} onChange={e=>setFilterQ(e.target.value)} />
          <input className="glass-input" placeholder="Search by Professor name" value={filterProfessor} onChange={e=>setFilterProfessor(e.target.value)} />
          <select className="glass-input" value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {['WORKSHOP','TRIP','BAZAAR','CONFERENCE','GYM_SESSION'].map(t=> <option key={t} value={t}>{t.replace('_',' ')}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyUpcoming} onChange={e=>setOnlyUpcoming(e.target.checked)} /> Upcoming only</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={withVendors} onChange={e=>setWithVendors(e.target.checked)} /> Include vendors</label>
          <div className="md:col-span-5 flex gap-2">
            <button className="btn btn-primary" onClick={loadEvents}>Search</button>
            <button className="btn" onClick={()=>{ setFilterQ(''); setFilterProfessor(''); setFilterType(''); setOnlyUpcoming(true); setWithVendors(true); loadEvents(); }}>Clear</button>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">All Events</h3>
        {events.map(e => (
          <div key={e._id} className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{e.title}</div>
                <div className="text-sm text-gray-300">Type: {e.type} | Status: {e.status}</div>
                {e.pendingUpdate?.response?.status === 'REJECTED' && (
                  <div className="mt-1 text-xs text-red-300">Professor rejected proposed edits{e.pendingUpdate?.response?.note ? `: ${e.pendingUpdate.response.note}` : ''}</div>
                )}
                {e.type==='BAZAAR' && Array.isArray(e.vendors) && e.vendors.length>0 && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium">Vendors:</div>
                    <ul className="list-disc pl-6">
                      {e.vendors.map((v,idx)=> (
                        <li key={idx}>
                          {v.vendorProfile?.companyName || 'Vendor'} — Booth {v.boothSize} — Attendees: {Array.isArray(v.attendees)? v.attendees.length : 0}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {e.type==='BAZAAR' && (pendingVendorByEvent.get(String(e._id)) || 0) > 0 && (
                  <div className="mt-1 text-xs text-yellow-300">Pending vendor requests: {pendingVendorByEvent.get(String(e._id))}</div>
                )}
                {/* Booth setup assignments view removed as per request */}
                {e.type==='GYM_SESSION' && e.gymDetails && (
                  <div className="mt-2 text-sm text-white/80">
                    Type: {e.gymDetails.sessionType || '-'} • Duration: {e.gymDetails.durationMinutes ?? '-'} mins • Max: {e.gymDetails.maxParticipants ?? '-'}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {(['PENDING','NEEDS_EDITS'].includes(e.status)) && (
                  <button className="btn btn-primary" onClick={()=>publish(e._id)}>Publish</button>
                )}
                {e.type==='TRIP' && <button className="btn" onClick={()=>beginEditTrip(e)}>Edit</button>}
                {e.type==='BAZAAR' && <button className="btn" onClick={()=>beginEditBazaar(e)}>Edit</button>}
                {e.type==='CONFERENCE' && <button className="btn" onClick={()=>beginEditConference(e)}>Edit</button>}
                {e.type==='WORKSHOP' && (<button className="btn" onClick={()=>requestEdits(e._id)}>Request Edits</button>)}
                {/* Removed Cancel as requested; keep Delete only */}
                <button className="btn" onClick={()=>del(e._id)}>Delete</button>
              </div>
            </div>
            {/* Workshop direct edit form removed for EO */}
            {editConferenceId === e._id && (
              <form onSubmit={saveEditConference} className="mt-4 grid md:grid-cols-3 gap-3">
                <input className="glass-input" placeholder="Conference Title" value={cTitle} onChange={ev=>setCTitle(ev.target.value)} required />
                <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">Start</span><input aria-label="Start date and time" className="glass-input flex-1" type="datetime-local" min={new Date().toISOString().slice(0,16)} value={cStartAt} onChange={ev=>setCStartAt(ev.target.value)} required /></div>
                <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">End</span><input aria-label="End date and time" className="glass-input flex-1" type="datetime-local" min={(cStartAt||new Date().toISOString().slice(0,16))} value={cEndAt} onChange={ev=>setCEndAt(ev.target.value)} required /></div>
                <input className="glass-input md:col-span-3" placeholder="Website" value={cWebsite} onChange={ev=>setCWebsite(ev.target.value)} required />
                <input className="glass-input" type="number" min="0" step="0.01" placeholder="Required Budget" value={cRequiredBudget} onChange={ev=>setCRequiredBudget(ev.target.value)} required />
                <select className="glass-input" value={cFundingSource} onChange={ev=>setCFundingSource(ev.target.value)}>
                  {['GUC','EXTERNAL'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <textarea className="glass-input md:col-span-3" placeholder="Short Description" value={cShortDesc} onChange={ev=>setCShortDesc(ev.target.value)} required />
                <textarea className="glass-input md:col-span-3" placeholder="Full Agenda (optional)" value={cFullAgenda} onChange={ev=>setCFullAgenda(ev.target.value)} />
                <textarea className="glass-input md:col-span-3" placeholder="Extra Resources (optional)" value={cExtraResources} onChange={ev=>setCExtraResources(ev.target.value)} />
                <div className="md:col-span-3 flex gap-2">
                  <button className="btn btn-primary" type="submit">Save</button>
                  <button className="btn" type="button" onClick={cancelEditConference}>Cancel</button>
                </div>
              </form>
            )}
            {editBazaarId === e._id && (
              <form onSubmit={saveEditBazaar} className="mt-4 grid md:grid-cols-3 gap-3">
                <input className="glass-input" placeholder="Bazaar Title" value={bTitle} onChange={ev=>setBTitle(ev.target.value)} required />
                <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">Start</span><input aria-label="Start date and time" className="glass-input flex-1" type="datetime-local" min={new Date().toISOString().slice(0,16)} value={bStartAt} onChange={ev=>setBStartAt(ev.target.value)} required /></div>
                <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">End</span><input aria-label="End date and time" className="glass-input flex-1" type="datetime-local" min={(bStartAt||new Date().toISOString().slice(0,16))} value={bEndAt} onChange={ev=>setBEndAt(ev.target.value)} required /></div>
                <select className="glass-input" value={bLocation} onChange={ev=>setBLocation(ev.target.value)} required>
                  <option value="" disabled>Select Bazaar Location</option>
                  <option value="GUC_CAIRO">GUC_CAIRO</option>
                  <option value="GUC_BERLIN">GUC_BERLIN</option>
                </select>
                <div className="md:col-span-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm whitespace-nowrap">Registration deadline</span>
                    <input
                      aria-label="Registration deadline"
                      className="glass-input flex-1"
                      type="datetime-local"
                      min={new Date().toISOString().slice(0,16)}
                      placeholder="Registration Deadline"
                      value={bRegDeadline}
                      onChange={ev=>setBRegDeadline(ev.target.value)}
                      required
                    />
                  </div>
                  <label className="inline-flex items-center gap-2 whitespace-nowrap">
                    <input type="checkbox" checked={bAllowsVendors} onChange={ev=>setBAllowsVendors(ev.target.checked)} />
                    Allows Vendors
                  </label>
                </div>
                <textarea className="glass-input md:col-span-3" placeholder="Short Description" value={bShortDesc} onChange={ev=>setBShortDesc(ev.target.value)} required />
                <div className="md:col-span-3 flex gap-2">
                  <button className="btn btn-primary" type="submit">Save</button>
                  <button className="btn" type="button" onClick={cancelEditBazaar}>Cancel</button>
                </div>
              </form>
            )}
            {editTripId === e._id && (
              <form onSubmit={saveEditTrip} className="mt-4 grid md:grid-cols-3 gap-3">
                <input className="glass-input" placeholder="Trip Title" value={eTitle} onChange={ev=>setETitle(ev.target.value)} required />
                <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">Start</span><input aria-label="Start date and time" className="glass-input flex-1" type="datetime-local" min={new Date().toISOString().slice(0,16)} value={eStartAt} onChange={ev=>setEStartAt(ev.target.value)} required /></div>
                <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">End</span><input aria-label="End date and time" className="glass-input flex-1" type="datetime-local" min={(eStartAt||new Date().toISOString().slice(0,16))} value={eEndAt} onChange={ev=>setEEndAt(ev.target.value)} required /></div>
                <select className="glass-input" value={eLocation} onChange={ev=>setELocation(ev.target.value)} required>
                  <option value="" disabled>Select Trip Location</option>
                  <option value="GUC_CAIRO">GUC_CAIRO</option>
                  <option value="GUC_BERLIN">GUC_BERLIN</option>
                </select>
                <input className="glass-input" type="number" min="0" step="0.01" placeholder="Price" value={ePrice} onChange={ev=>setEPrice(ev.target.value)} required />
                <input className="glass-input" type="number" min="1" step="1" placeholder="Capacity" value={eCapacity} onChange={ev=>setECapacity(ev.target.value)} required />
                <div className="flex items-center gap-2"><span className="text-sm whitespace-nowrap">Registration deadline</span><input aria-label="Registration deadline" className="glass-input flex-1" type="datetime-local" min={new Date().toISOString().slice(0,16)} placeholder="Registration Deadline" value={eRegDeadline} onChange={ev=>setERegDeadline(ev.target.value)} required /></div>
                <textarea className="glass-input md:col-span-3" placeholder="Short Description" value={eShortDesc} onChange={ev=>setEShortDesc(ev.target.value)} required />
                <div className="md:col-span-3 flex gap-2">
                  <button className="btn btn-primary" type="submit">Save</button>
                  <button className="btn" type="button" onClick={cancelEditTrip}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
      </>
      )}

      {sectionFilter === null && (
        <div className="text-sm opacity-70">Select a section from the Events Office menu to get started.</div>
      )}
      <ProposeEditsDialog open={pdOpen} event={pdEvent} onConfirm={submitProposedEdits} onClose={()=>{ setPdOpen(false); setPdEvent(null) }} />
      <PromptModal
        open={!!prompt.open}
        title={prompt.title}
        message={prompt.message}
        confirmLabel={prompt.confirmLabel || 'Confirm'}
        cancelLabel={prompt.cancelLabel || 'Cancel'}
        placeholder={prompt.placeholder}
        defaultValue={prompt.defaultValue}
        showInput={!!prompt.showInput}
        multiline={!!prompt.multiline}
        onConfirm={prompt.onConfirm}
        onClose={prompt.onClose}
      />
    </div>
  )
}