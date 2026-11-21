import React, { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { FaHome, FaUsersCog, FaChalkboardTeacher, FaStore, FaTools, FaUsers, FaTrash, FaPlus, FaChevronDown, FaSearch, FaClipboardList, FaDumbbell, FaMapMarkedAlt, FaCalendarAlt, FaCheckCircle, FaClipboardCheck } from 'react-icons/fa'

const linksByRole = {
  STUDENT: [
    { to: '/student-dashboard', label: 'Dashboard', icon: FaHome },
    { to: '/gym-schedule', label: 'Gym Schedule', icon: FaDumbbell }
  ],
  STAFF: [
    { to: '/staff-dashboard', label: 'Dashboard', icon: FaHome },
    { to: '/gym-schedule', label: 'Gym Schedule', icon: FaDumbbell }
  ],
  TA: [
    { to: '/ta-dashboard/browse', label: 'Browse Events', icon: FaSearch },
    { to: '/ta-dashboard/registrations', label: 'My Registrations', icon: FaClipboardList },
    { to: '/gym-schedule', label: 'Gym Schedule', icon: FaDumbbell }
  ],
  PROFESSOR: [
    { to: '/professor-dashboard', label: 'Dashboard', icon: FaChalkboardTeacher },
    { to: '/gym-schedule', label: 'Gym Schedule', icon: FaDumbbell }
  ],
  EVENTS_OFFICE: [
    { to: '/eventoffice-dashboard', label: 'Dashboard', icon: FaTools },
    { to: '/gym-schedule', label: 'Gym Schedule', icon: FaDumbbell }
  ],
  // ADMIN handled specially below for collapsible menu
  ADMIN: [],
  VENDOR: [{ to: '/vendor-dashboard', label: 'Vendor', icon: FaStore }],
}

export default function Sidebar() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const roles = user?.roles || []
  const role = roles[0]
  const defaultLinks = linksByRole[role] || []

  const isUsersSectionActive = pathname.startsWith('/admin-dashboard/users')
  const [usersOpen, setUsersOpen] = useState(isUsersSectionActive)
  const isVendorSectionActive = pathname.startsWith('/vendor-dashboard')
  const [vendorOpen, setVendorOpen] = useState(isVendorSectionActive)
  const isEOSectionActive = pathname.startsWith('/eventoffice-dashboard')
  const [eoOpen, setEoOpen] = useState(isEOSectionActive)
  const isStaffSectionActive = pathname.startsWith('/staff-dashboard')
  const [staffOpen, setStaffOpen] = useState(isStaffSectionActive)
  const isProfessorSectionActive = pathname.startsWith('/professor-dashboard')
  const [profOpen, setProfOpen] = useState(isProfessorSectionActive)
  const isStudentSectionActive = pathname.startsWith('/student-dashboard')
  const [studentOpen, setStudentOpen] = useState(isStudentSectionActive)

  const navItems = useMemo(() => defaultLinks, [defaultLinks])

  return (
    <aside className="w-64 h-full p-3 sticky top-0">
      <div className="glass h-full p-3">
        <div className="px-2 py-2 font-semibold text-white/90">Menu</div>
        <nav className="flex flex-col gap-1">
          {/* Hide default links for roles that use grouped menus below */}
          {role !== 'ADMIN' && role !== 'VENDOR' && role !== 'EVENTS_OFFICE' && role !== 'STAFF' && role !== 'PROFESSOR' && role !== 'STUDENT' && navItems.map((l) => {
            const Icon = l.icon || FaHome
            return (
              <NavLink
                key={l.to}
                to={l.to}
                title={l.label}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`
                }
              >
                <Icon className="text-guc-gold" />
                <span>{l.label}</span>
              </NavLink>
            )
          })}

          {role === 'STAFF' && (
            <>
              <button
                type="button"
                onClick={() => setStaffOpen(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition ${isStaffSectionActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`}
                aria-expanded={staffOpen}
              >
                <span className="flex items-center gap-2">
                  <FaUsers className="text-guc-gold" />
                  <span>Staff</span>
                </span>
                <FaChevronDown className={`transition-transform ${staffOpen ? 'rotate-180' : ''}`} />
              </button>
              {staffOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <NavLink
                    to="/staff-dashboard#browse"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaSearch className="text-guc-gold" />
                    <span>Browse Events</span>
                  </NavLink>
                  <NavLink
                    to="/staff-dashboard#registrations"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaClipboardList className="text-guc-gold" />
                    <span>My Registrations</span>
                  </NavLink>
                  <NavLink
                    to="/staff-dashboard#gyms"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaDumbbell className="text-guc-gold" />
                    <span>Gym Sessions</span>
                  </NavLink>
                </div>
              )}
            </>
          )}

          {role === 'VENDOR' && (
            <>
              <button
                type="button"
                onClick={() => setVendorOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition ${isVendorSectionActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`}
                aria-expanded={vendorOpen}
              >
                <span className="flex items-center gap-2">
                  <FaStore className="text-guc-gold" />
                  <span>Vendor</span>
                </span>
                <FaChevronDown className={`transition-transform ${vendorOpen ? 'rotate-180' : ''}`} />
              </button>
              {vendorOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <NavLink
                    to="/vendor-dashboard#apply"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`
                    }
                  >
                    <FaMapMarkedAlt className="text-guc-gold" />
                    <span>Apply Booth Setup</span>
                  </NavLink>
                  <NavLink
                    to="/vendor-dashboard#bazaars"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`
                    }
                  >
                    <FaCalendarAlt className="text-guc-gold" />
                    <span>Available Bazaars</span>
                  </NavLink>
                  <NavLink
                    to="/vendor-dashboard#accepted"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`
                    }
                  >
                    <FaCheckCircle className="text-guc-gold" />
                    <span>Upcoming Participations</span>
                  </NavLink>
                  <NavLink
                    to="/vendor-dashboard#requests"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`
                    }
                  >
                    <FaClipboardCheck className="text-guc-gold" />
                    <span>My Requests</span>
                  </NavLink>
                </div>
              )}
            </>
          )}

          {role === 'EVENTS_OFFICE' && (
            <>
              <button
                type="button"
                onClick={() => setEoOpen(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition ${isEOSectionActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`}
                aria-expanded={eoOpen}
              >
                <span className="flex items-center gap-2">
                  <FaTools className="text-guc-gold" />
                  <span>Events Office</span>
                </span>
                <FaChevronDown className={`transition-transform ${eoOpen ? 'rotate-180' : ''}`} />
              </button>
              {eoOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <NavLink
                    to="/eventoffice-dashboard#create"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaPlus className="text-guc-gold" />
                    <span>Create Event</span>
                  </NavLink>
                  <NavLink
                    to="/eventoffice-dashboard#workshops"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaChalkboardTeacher className="text-guc-gold" />
                    <span>Professor Workshops</span>
                  </NavLink>
                  <NavLink
                    to="/eventoffice-dashboard#vendors"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaStore className="text-guc-gold" />
                    <span>Vendor Requests</span>
                  </NavLink>
                  <NavLink
                    to="/eventoffice-dashboard#events"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaClipboardList className="text-guc-gold" />
                    <span>All Events</span>
                  </NavLink>
                </div>
              )}
            </>
          )}

          {role === 'PROFESSOR' && (
            <>
              <button
                type="button"
                onClick={() => setProfOpen(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition ${isProfessorSectionActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`}
                aria-expanded={profOpen}
              >
                <span className="flex items-center gap-2">
                  <FaChalkboardTeacher className="text-guc-gold" />
                  <span>Professor</span>
                </span>
                <FaChevronDown className={`transition-transform ${profOpen ? 'rotate-180' : ''}`} />
              </button>
              {profOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <NavLink
                    to="/professor-dashboard#browse"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaSearch className="text-guc-gold" />
                    <span>Browse Events</span>
                  </NavLink>
                  <NavLink
                    to="/professor-dashboard#create"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaPlus className="text-guc-gold" />
                    <span>Create Workshop</span>
                  </NavLink>
                  <NavLink
                    to="/professor-dashboard#my-workshops"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaChalkboardTeacher className="text-guc-gold" />
                    <span>My Workshops</span>
                  </NavLink>
                  <NavLink
                    to="/professor-dashboard#registrations"
                    className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}
                  >
                    <FaClipboardList className="text-guc-gold" />
                    <span>My Registrations</span>
                  </NavLink>
                </div>
              )}
            </>
          )}

          {role === 'STUDENT' && (
            <>
              <button
                type="button"
                onClick={() => setStudentOpen(v => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition ${isStudentSectionActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`}
                aria-expanded={studentOpen}
              >
                <span className="flex items-center gap-2">
                  <FaUsers className="text-guc-gold" />
                  <span>Student</span>
                </span>
                <FaChevronDown className={`transition-transform ${studentOpen ? 'rotate-180' : ''}`} />
              </button>
              {studentOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <NavLink to="/student-dashboard#browse" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}>
                    <FaSearch className="text-guc-gold" />
                    <span>Browse Events</span>
                  </NavLink>
                  <NavLink to="/student-dashboard#registrations" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}>
                    <FaClipboardList className="text-guc-gold" />
                    <span>My Registrations</span>
                  </NavLink>
                  <NavLink to="/student-dashboard#gyms" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}>
                    <FaDumbbell className="text-guc-gold" />
                    <span>Gym Sessions</span>
                  </NavLink>
                  <NavLink to="/student-dashboard#courts" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : 'border border-white/5'}`}>
                    <FaMapMarkedAlt className="text-guc-gold" />
                    <span>Court Availability</span>
                  </NavLink>
                </div>
              )}
            </>
          )}

          {role === 'ADMIN' && (
            <>
              <button
                type="button"
                onClick={() => setUsersOpen((v) => !v)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition ${isUsersSectionActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`}
                aria-expanded={usersOpen}
              >
                <span className="flex items-center gap-2">
                  <FaUsers className="text-guc-gold" />
                  <span>Users</span>
                </span>
                <FaChevronDown className={`transition-transform ${usersOpen ? 'rotate-180' : ''}`} />
              </button>
              {usersOpen && (
                <div className="ml-6 flex flex-col gap-1">
                  <NavLink
                    to="/admin-dashboard/users"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`
                    }
                  >
                    <FaUsersCog className="text-guc-gold" />
                    <span>View All Users</span>
                  </NavLink>
                  <NavLink
                    to="/admin-dashboard/users/delete"
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`
                    }
                  >
                    <FaTrash className="text-guc-gold" />
                    <span>Delete Admin / EO</span>
                  </NavLink>
                </div>
              )}

              <NavLink
                to="/admin-dashboard/create"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`
                }
              >
                <FaPlus className="text-guc-gold" />
                <span>Create ADMIN / EO</span>
              </NavLink>

              <NavLink
                to="/admin-dashboard/vendors"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`
                }
              >
                <FaStore className="text-guc-gold" />
                <span>Vendor Requests (Pending)</span>
              </NavLink>

              <NavLink
                to="/admin/events-delete"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition ${isActive ? 'bg-white/10 ring-1 ring-guc-gold/40' : ''}`
                }
              >
                <FaTrash className="text-guc-gold" />
                <span>Delete Events</span>
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </aside>
  )
}