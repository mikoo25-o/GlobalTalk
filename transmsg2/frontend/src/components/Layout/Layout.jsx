import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
  const menuItems = [
    {
      label: 'Dashboard',
      path: '/',
      icon: 'ti ti-layout-dashboard',
    },
    {
      label: 'Campaigns',
      path: '/campaigns',
      icon: 'ti ti-send',
    },
    {
      label: 'Accounts',
      path: '/accounts',
      icon: 'ti ti-device-mobile',
    },
    {
      label: 'Upload',
      path: '/upload',
      icon: 'ti ti-upload',
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: 'ti ti-settings',
    },
  ]

  return (
    <div className="app-shell">

      <aside className="sidebar">

        <div className="sidebar-top">
          <div className="brand-logo">
            T
          </div>

          <div>
            <div className="brand-name">
              TransMsg
            </div>

            <div className="brand-sub">
              Messaging Platform
            </div>
          </div>
        </div>

        <div className="sidebar-section-title">
          MAIN MENU
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'sidebar-link active'
                  : 'sidebar-link'
              }
            >
              <i className={item.icon}></i>

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">

          <div className="sidebar-status">
            <div className="status-dot"></div>

            <div>
              <div className="status-title">
                System Online
              </div>

              <div className="status-sub">
                All services operational
              </div>
            </div>
          </div>

        </div>

      </aside>

      <main className="main-content">
        <Outlet />
      </main>

    </div>
  )
}