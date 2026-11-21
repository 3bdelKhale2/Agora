import React from 'react'
import { useAuth } from '../context/AuthContext'
import AnimatedButton from './AnimatedButton.jsx'
import { createPortal } from 'react-dom'

export default function RegisterDialog({ open, event, onConfirm, onClose }) {
  const { user } = useAuth()
  if (!open) return null

  // Prevent page scroll while modal is open
  React.useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : ''
  const email = user?.email || ''
  const gucId = user?.gucId || ''

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 card w-full max-w-md">
        <h3 className="text-lg font-semibold">Confirm Registration</h3>
        <p className="text-sm text-white/70 mt-1">You are registering to:</p>
        <div className="mt-1 text-sm font-medium">{event?.title}</div>
        <div className="mt-3 text-sm text-white/80">These details will be saved with your registration:</div>
        <ul className="mt-2 text-sm space-y-1">
          <li><span className="text-white/60">Name:</span> {fullName || '-'}</li>
          <li><span className="text-white/60">Email:</span> {email || '-'}</li>
          <li><span className="text-white/60">GUC ID:</span> {gucId || '-'}</li>
        </ul>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Cancel</button>
          <AnimatedButton onClick={() => onConfirm?.(event?._id)}>Confirm</AnimatedButton>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
