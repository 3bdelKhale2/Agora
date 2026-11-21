import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  try {
    let token = null
    const raw = sessionStorage.getItem('agora.auth') || localStorage.getItem('agora.auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && parsed.token) token = parsed.token
    }
    // Global fallback (set in AuthContext) in case storage read races or is cleared
    if (!token && typeof window !== 'undefined' && window.__AGORA_TOKEN) {
      token = window.__AGORA_TOKEN
    }
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {/* swallow */}
  return config
})