import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { FaUniversity } from 'react-icons/fa'
import AnimatedButton from './AnimatedButton.jsx'
import ThemeToggle from './ThemeToggle.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="w-full relative">
      {/* Transparent navbar surface (no gradient overlay) */}
      <div className="relative glass-strong navbar-transparent px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold tracking-wide">
          <FaUniversity className="text-guc-gold drop-shadow" />
          <span>Agora</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-90">{user?.firstName} {user?.lastName}</span>
          <ThemeToggle />
          <AnimatedButton variant="red" onClick={async () => { await logout(); navigate('/'); }}>
            Logout
          </AnimatedButton>
        </div>
      </div>
    </div>
  )
}