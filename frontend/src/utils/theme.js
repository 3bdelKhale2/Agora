const THEME_KEY = 'theme'

export function getTheme() {
  if (typeof window === 'undefined') return 'dark'
  const t = localStorage.getItem(THEME_KEY)
  return t === 'classic' ? 'classic' : 'dark'
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isClassic = theme === 'classic'
  root.classList.toggle('theme-classic', isClassic)
}

export function setTheme(theme) {
  const t = theme === 'classic' ? 'classic' : 'dark'
  try { localStorage.setItem(THEME_KEY, t) } catch {}
  applyTheme(t)
  return t
}

export function toggleTheme() {
  const next = getTheme() === 'classic' ? 'dark' : 'classic'
  return setTheme(next)
}

export function initTheme() {
  const current = getTheme()
  applyTheme(current)
  return current
}
