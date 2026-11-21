import React from 'react'
import { motion } from 'framer-motion'

export default function AnimatedButton({ children, variant = 'primary', className = '', ...props }) {
  const base = variant === 'gold' ? 'btn btn-gold' : variant === 'red' ? 'btn btn-red' : 'btn btn-primary'
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className={`${base} hover-glow ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  )
}