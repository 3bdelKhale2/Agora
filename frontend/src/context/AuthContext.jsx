import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../utils/api'

// Roles reference: see backend model [backend/models/userModel.js](backend/models/userModel.js)
const AuthContext = createContext(null)

const STORAGE_KEY = 'agora.auth'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check both localStorage (remember me) and sessionStorage
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const { token, user } = JSON.parse(raw)
        setToken(token || null)
        setUser(user || null)
        // Expose globally as a resilience fallback for API interceptor
        if (token) {
          window.__AGORA_TOKEN = token
          window.__AGORA_USER = user
        }
      } catch {}
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!token) {
      // Clear from both storages on logout
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
    }
    // Note: Storage is set explicitly in login() based on rememberMe choice
  }, [token])

  const login = async (email, password, rememberMe = false) => {
    const res = await api.post('/auth/login', { email, password })
    setToken(res.data.token)
    setUser(res.data.user)
    
    // Store in localStorage if remember me is checked, otherwise sessionStorage
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEY, JSON.stringify({ token: res.data.token, user: res.data.user }))
    // Set global debug / fallback values (in case storage access races)
    window.__AGORA_TOKEN = res.data.token
    window.__AGORA_USER = res.data.user
    
    toast.success('Signed in')
    return res.data
  }

  const signup = async (payload) => {
    const res = await api.post('/auth/signup', payload)
    // Students/Vendors receive token; others get 202
    if (res.data.token) {
      setToken(res.data.token)
      setUser(res.data.user)
      toast.success('Account created')
    } else {
      toast.success('Signup successful. Check email after admin approval.')
    }
    return res.data
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    sessionStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
    window.__AGORA_TOKEN = null
    window.__AGORA_USER = null
    toast.success('Signed out')
  }

  const value = useMemo(() => ({
    token, user, loading, login, logout, signup,
    isAuthenticated: !!token,
    hasRole: (r) => Array.isArray(user?.roles) && user.roles.includes(r),
  }), [token, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}