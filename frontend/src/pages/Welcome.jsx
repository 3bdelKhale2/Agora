import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard.jsx'
import AnimatedButton from '../components/AnimatedButton.jsx'
import { FaUniversity } from 'react-icons/fa'
import logo from '../assets/agora-logo.png'

const images = [
  'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552728089-57bdde30beb3?q=80&w=1600&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop',
]

export default function Welcome() {
  const navigate = useNavigate()
  const [idx, setIdx] = React.useState(0)

  React.useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % images.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background slideshow with subtle zoom */}
      <motion.img
        key={idx}
        src={images[idx]}
        alt=""
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute inset-0 h-full w-full object-cover blur-sm"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/60" />

      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6">
        <motion.img
          src={logo}
          alt="Agora logo"
          className="mx-auto w-24 h-24 md:w-28 md:h-28 rounded-full object-contain ring-2 ring-guc-gold/60 shadow-glow"
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        />

        <motion.h1
          className="text-4xl md:text-6xl font-extrabold text-guc-gold"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Agora – The GUC Event Management Platform
        </motion.h1>

        <motion.p className="mt-3 max-w-2xl text-lg text-white/90"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          Discover. Connect. Experience — Your GUC Events Hub.
        </motion.p>

        <GlassCard className="mt-10 w-full max-w-md p-6">
          <div className="flex gap-4 justify-center">
            <AnimatedButton variant="gold" onClick={() => navigate('/login')}>Sign In</AnimatedButton>
            <AnimatedButton onClick={() => navigate('/signup')}>Sign Up</AnimatedButton>
          </div>
        </GlassCard>
      </div>

      {/* Animated gradient overlay accent */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-header-gradient opacity-40 animate-gradient-x" />
    </div>
  )
}