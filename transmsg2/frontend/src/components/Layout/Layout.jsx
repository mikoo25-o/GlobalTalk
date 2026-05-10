import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import s from './Layout.module.css'

const NAV = [
  { to:'/dashboard',    icon:'ti-layout-dashboard', label:'Dashboard' },
  { to:'/upload',       icon:'ti-upload',            label:'Upload Numbers' },
  { to:'/accounts',     icon:'ti-device-mobile',     label:'Accounts' },
  { to:'/campaigns',    icon:'ti-speakerphone',       label:'Campaigns' },
  { to:'/settings',     icon:'ti-settings',           label:'Settings' },
]

export default function Layout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <div className={s.shell}>
      {open && <div className={s.overlay} onClick={() => setOpen(false)} />}
      <aside className={`${s.sidebar} ${open ? s.open : ''}`}>
        <div className={s.logo}>
          <div className={s.logoIcon}><i className="ti ti-world" /></div>
          <div>
            <div className={s.logoName}>TransMsg</div>
            <div className={s.logoSub}>Bulk Messaging Platform</div>
          </div>
          <button className={s.closeBtn} onClick={() => setOpen(false)}><i className="ti ti-x" /></button>
        </div>
        <nav className={s.nav}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)}
              className={({ isActive }) => `${s.navItem} ${isActive ? s.active : ''}`}>
              <i className={`ti ${n.icon}`} /><span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={s.footer}>
          <div className={s.testBadge}><i className="ti ti-test-pipe" /> Test Mode Active</div>
        </div>
      </aside>
      <div className={s.main}>
        <div className={s.topbar}>
          <button className={s.burger} onClick={() => setOpen(true)}><i className="ti ti-menu-2" /></button>
          <span className={s.topTitle}>TransMsg</span>
          <button className="btn btn-primary" onClick={() => navigate('/campaigns/new')}>
            <i className="ti ti-plus" /> New Campaign
          </button>
        </div>
        <div className={s.content}><Outlet /></div>
      </div>
    </div>
  )
}
