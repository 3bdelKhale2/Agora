import React from 'react'
import { motion } from 'framer-motion'

export default function EventCard({ event, action }) {
  const fmt = (d) => {
    try {
      const dt = new Date(d)
      if (!d || Number.isNaN(dt.getTime())) return '-'
      return dt.toLocaleString()
    } catch { return '-' }
  }

  const regDeadline = event.registrationDeadline
    || event.tripDetails?.registrationDeadline
    || event.bazaarDetails?.registrationDeadline
    || null
  
  const isGym = event.type === 'GYM_SESSION'
  const gym = event.gymDetails || {}

  return (
    <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="glass p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{event.title}</h3>
        <span className="text-xs px-2 py-1 rounded bg-guc-gold/20 text-guc-gold border border-guc-gold/30">
          {event.type}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/80">{event.description || 'No description'}</p>
      <div className="mt-3 grid gap-1 text-xs text-white/70">
        <div><span className="text-white/60">Start:</span> {fmt(event.startAt)}</div>
        <div><span className="text-white/60">End:</span> {fmt(event.endAt)}</div>
        {regDeadline && (
          <div><span className="text-white/60">Registration deadline:</span> {fmt(regDeadline)}</div>
        )}
        {isGym && (
          <div className="text-white/70">
            <span className="text-white/60">Type:</span> {gym.sessionType || '-'}
            {' '}•{' '}
            <span className="text-white/60">Duration:</span> {gym.durationMinutes ?? '-'} mins
            {' '}•{' '}
            <span className="text-white/60">Max:</span> {gym.maxParticipants ?? '-'}
          </div>
        )}
      </div>
      {action}
    </motion.div>
  )
}