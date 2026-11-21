import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ roles, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth()
  const loc = useLocation()

  if (loading) return null
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: loc }} replace />

  // Role-based unauthorized step removed; allow access once authenticated
  return <Outlet />
}