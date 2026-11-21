import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

const FACULTIES = ['MET','IET','DMET','APPLIED_ARTS','ARCH_ENG','CIVIL_ENG','PHARMACY','BI','DENTISTRY']

export default function ProposeEditsDialog({ open, event, onConfirm, onClose }) {
  const initial = useMemo(() => ({
    title: event?.title || '',
    location: event?.location || 'GUC_CAIRO',
    startAt: event?.startAt ? toLocal(event.startAt) : '',
    endAt: event?.endAt ? toLocal(event.endAt) : '',
    capacity: event?.capacity ?? '',
    registrationDeadline: event?.registrationDeadline ? toLocal(event.registrationDeadline) : '',
    shortDescription: event?.shortDescription || event?.description || '',
    fullAgenda: event?.fullAgenda || '',
    faculty: event?.faculty || '',
    professors: Array.isArray(event?.professors) ? event.professors.join(', ') : '',
    requiredBudget: event?.requiredBudget ?? '',
    fundingSource: event?.fundingSource || 'GUC',
    extraResources: event?.extraResources || '',
  }), [event])

  const [values, setValues] = useState(initial)
  const [selected, setSelected] = useState({})
  const [note, setNote] = useState('')

  if (!open) return null

  const set = (name) => (e) => setValues(v => ({ ...v, [name]: e.target.value }))
  const toggle = (name) => (e) => setSelected(s => ({ ...s, [name]: e.target.checked }))

  const submit = () => {
    const proposedChanges = {}
    let any = false
    for (const [k, on] of Object.entries(selected)) {
      if (!on) continue
      any = true
      let val = values[k]
      // Coerce and validate per key
      if (k === 'capacity') {
        const n = Number(val)
        if (!Number.isInteger(n) || n <= 0) { toast.error('Capacity must be a positive integer'); return }
        proposedChanges[k] = n
        continue
      }
      if (k === 'requiredBudget') {
        const n = Number(val)
        if (!Number.isFinite(n) || n < 0) { toast.error('Required budget must be a non-negative number'); return }
        proposedChanges[k] = n
        continue
      }
      if (k === 'professors') {
        const arr = String(val || '').split(',').map(s=>s.trim()).filter(Boolean)
        if (arr.length === 0) { toast.error('Please specify at least one professor name'); return }
        proposedChanges[k] = arr
        continue
      }
      if (k === 'startAt' || k === 'endAt' || k === 'registrationDeadline') {
        if (!val) { toast.error(`${labelFor(k)} is required`); return }
        proposedChanges[k] = val
        continue
      }
      if (k === 'title' || k === 'shortDescription' || k === 'fullAgenda' || k === 'faculty' || k === 'fundingSource' || k === 'location') {
        if (String(val || '').trim() === '') { toast.error(`${labelFor(k)} cannot be empty`); return }
        proposedChanges[k] = val
        continue
      }
      // default passthrough
      proposedChanges[k] = val
    }
    if (!any) { toast.error('Select at least one field to propose'); return }
    onConfirm?.({ proposedChanges, reviewNotes: note })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 card w-full max-w-3xl max-h-[80vh] overflow-auto">
        <h3 className="text-lg font-semibold">Request Edits — {event?.title}</h3>
        <p className="text-sm text-white/70">Select fields to include and adjust their values.</p>

        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <Field label="Title" name="title" type="text" value={values.title} onChange={set('title')} checked={!!selected.title} onCheck={toggle('title')} />
          <div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!selected.location} onChange={toggle('location')} /> Location</label>
            <select className="glass-input mt-1 w-full" value={values.location} onChange={set('location')}>
              <option value="GUC_CAIRO">GUC_CAIRO</option>
              <option value="GUC_BERLIN">GUC_BERLIN</option>
            </select>
          </div>
          <DateField label="Start" name="startAt" value={values.startAt} onChange={set('startAt')} checked={!!selected.startAt} onCheck={toggle('startAt')} />
          <DateField label="End" name="endAt" value={values.endAt} onChange={set('endAt')} checked={!!selected.endAt} onCheck={toggle('endAt')} />
          <Field label="Capacity" name="capacity" type="number" value={values.capacity} onChange={set('capacity')} checked={!!selected.capacity} onCheck={toggle('capacity')} />
          <DateField label="Registration deadline" name="registrationDeadline" value={values.registrationDeadline} onChange={set('registrationDeadline')} checked={!!selected.registrationDeadline} onCheck={toggle('registrationDeadline')} />
          <AreaField label="Short description" name="shortDescription" value={values.shortDescription} onChange={set('shortDescription')} checked={!!selected.shortDescription} onCheck={toggle('shortDescription')} />
          <AreaField label="Full agenda" name="fullAgenda" value={values.fullAgenda} onChange={set('fullAgenda')} checked={!!selected.fullAgenda} onCheck={toggle('fullAgenda')} />
          <div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!selected.faculty} onChange={toggle('faculty')} /> Faculty</label>
            <select className="glass-input mt-1 w-full" value={values.faculty} onChange={set('faculty')}>
              <option value="">Select Faculty</option>
              {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <AreaField label="Professors (comma-separated)" name="professors" value={values.professors} onChange={set('professors')} checked={!!selected.professors} onCheck={toggle('professors')} />
          <Field label="Required budget" name="requiredBudget" type="number" value={values.requiredBudget} onChange={set('requiredBudget')} checked={!!selected.requiredBudget} onCheck={toggle('requiredBudget')} />
          <div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!selected.fundingSource} onChange={toggle('fundingSource')} /> Funding source</label>
            <select className="glass-input mt-1 w-full" value={values.fundingSource} onChange={set('fundingSource')}>
              <option value="GUC">GUC</option>
              <option value="EXTERNAL">EXTERNAL</option>
            </select>
          </div>
          <AreaField label="Extra resources" name="extraResources" value={values.extraResources} onChange={set('extraResources')} checked={!!selected.extraResources} onCheck={toggle('extraResources')} />
        </div>

        <div className="mt-3">
          <label className="text-sm">Note to professor (optional)</label>
          <textarea className="glass-input mt-1 w-full" rows={2} value={note} onChange={e=>setNote(e.target.value)} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Send Request</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, name, type='text', value, onChange, checked, onCheck }){
  return (
    <div>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={onCheck} /> {label}</label>
      <input className="glass-input mt-1 w-full" name={name} type={type} value={value} onChange={onChange} />
    </div>
  )
}

function AreaField({ label, name, value, onChange, checked, onCheck }){
  return (
    <div className="md:col-span-2">
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={onCheck} /> {label}</label>
      <textarea className="glass-input mt-1 w-full" rows={2} name={name} value={value} onChange={onChange} />
    </div>
  )
}

function DateField({ label, name, value, onChange, checked, onCheck }){
  return (
    <div>
      <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={onCheck} /> {label}</label>
      <input className="glass-input mt-1 w-full" name={name} type="datetime-local" min={new Date().toISOString().slice(0,16)} value={value} onChange={onChange} />
    </div>
  )
}

function toLocal(d){
  try{
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return ''
    const pad = (n) => String(n).padStart(2,'0')
    const y = dt.getFullYear(); const m = pad(dt.getMonth()+1); const day = pad(dt.getDate());
    const h = pad(dt.getHours()); const min = pad(dt.getMinutes())
    return `${y}-${m}-${day}T${h}:${min}`
  } catch { return '' }
}

function labelFor(key){
  switch (key) {
    case 'startAt': return 'Start date/time'
    case 'endAt': return 'End date/time'
    case 'registrationDeadline': return 'Registration deadline'
    case 'shortDescription': return 'Short description'
    case 'fullAgenda': return 'Full agenda'
    case 'requiredBudget': return 'Required budget'
    case 'fundingSource': return 'Funding source'
    default: return key
  }
}
