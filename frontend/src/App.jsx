import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Welcome from './pages/Welcome.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import StudentDashboard from './pages/dashboards/StudentDashboard.jsx'
import StaffDashboard from './pages/dashboards/StaffDashboard.jsx'
import TADashboard from './pages/dashboards/TADashboard.jsx'
import ProfessorDashboard from './pages/dashboards/ProfessorDashboard.jsx'
import EventOfficeDashboard from './pages/dashboards/EventOfficeDashboard.jsx'
import VendorDashboard from './pages/dashboards/VendorDashboard.jsx'
import GymSchedule from './pages/GymSchedule.jsx'
// Admin subpages
import AdminUsersView from './pages/dashboards/admin/AdminUsersView.jsx'
import AdminUsersDelete from './pages/dashboards/admin/AdminUsersDelete.jsx'
import AdminCreate from './pages/dashboards/admin/AdminCreate.jsx'
import AdminVendorRequests from './pages/dashboards/admin/AdminVendorRequests.jsx'
import AdminEventsDelete from './pages/dashboards/admin/AdminEventsDelete.jsx'

export default function App() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Student */}
        <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/student-dashboard" element={<StudentDashboard />} />
            <Route path="/gym-schedule" element={<GymSchedule />} />
          </Route>
        </Route>
        {/* Staff */}
        <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/gym-schedule" element={<GymSchedule />} />
          </Route>
        </Route>
        {/* TA */}
        <Route element={<ProtectedRoute allowedRoles={['TA']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/ta-dashboard" element={<Navigate to="/ta-dashboard/browse" replace />} />
            <Route path="/ta-dashboard/*" element={<TADashboard />} />
            <Route path="/gym-schedule" element={<GymSchedule />} />
          </Route>
        </Route>
        {/* Professor */}
        <Route element={<ProtectedRoute allowedRoles={['PROFESSOR']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/professor-dashboard" element={<ProfessorDashboard />} />
            <Route path="/gym-schedule" element={<GymSchedule />} />
          </Route>
        </Route>
        {/* Events Office */}
        <Route element={<ProtectedRoute allowedRoles={['EVENTS_OFFICE']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/eventoffice-dashboard" element={<EventOfficeDashboard />} />
            <Route path="/gym-schedule" element={<GymSchedule />} />
          </Route>
        </Route>
        {/* Admin */}
        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route element={<DashboardLayout />}>
            {/* Redirect old entry to Users */}
            <Route path="/admin-dashboard" element={<Navigate to="/admin-dashboard/users" replace />} />
            <Route path="/admin-dashboard/users" element={<AdminUsersView />} />
            <Route path="/admin-dashboard/users/delete" element={<AdminUsersDelete />} />
            <Route path="/admin-dashboard/create" element={<AdminCreate />} />
            <Route path="/admin-dashboard/vendors" element={<AdminVendorRequests />} />
            <Route path="/admin/events-delete" element={<AdminEventsDelete />} />
          </Route>
        </Route>
        {/* Vendor */}
        <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/vendor-dashboard" element={<VendorDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}