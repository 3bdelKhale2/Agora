import React from 'react'
import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', initial = { opacity: 0, y: 12 }, animate = { opacity: 1, y: 0 }, ...rest }) {
  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`glass ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  )
}