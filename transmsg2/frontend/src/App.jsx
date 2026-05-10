import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import Accounts from './pages/Accounts'
import NewCampaign from './pages/NewCampaign'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Settings from './pages/Settings'
import './styles/global.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"          element={<Dashboard />} />
          <Route path="upload"             element={<Upload />} />
          <Route path="accounts"           element={<Accounts />} />
          <Route path="campaigns"          element={<Campaigns />} />
          <Route path="campaigns/new"      element={<NewCampaign />} />
          <Route path="campaigns/:id"      element={<CampaignDetail />} />
          <Route path="settings"           element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
