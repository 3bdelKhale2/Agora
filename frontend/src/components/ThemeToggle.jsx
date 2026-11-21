import React, { useEffect, useState } from 'react'
import { getTheme, toggleTheme } from '../utils/theme.js'
import { FaMoon, FaSun } from 'react-icons/fa'

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(getTheme())

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'theme') setTheme(getTheme())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isClassic = theme === 'classic'
  const label = isClassic ? 'Dark mode' : 'Classic mode'

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title={`Switch to ${label}`}
      className={`btn btn-red whitespace-nowrap ${className}`}
      onClick={() => setTheme(toggleTheme())}
    >
      {isClassic ? <FaMoon className="mr-2" /> : <FaSun className="mr-2" />}
      {label}
    </button>
  )
}
