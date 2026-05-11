import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getOverview, getCampaigns } from '../utils/api'

export default function Dashboard() {
  const navigate = useNavigate()

  const [overview, setOverview] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getOverview(), getCampaigns()])
      .then(([ov, camp]) => {
        setOverview(ov.data)
        setCampaigns(camp.data.slice(0, 5))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="loading-box">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="dashboard-page">

      <div className="dashboard-top">

        <div>
          <h1 className="dashboard-title">
            Dashboard
          </h1>

          <p className="dashboard-subtitle">
            Real-time overview of your messaging platform
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => navigate('/campaigns/new')}
        >
          + New Campaign
        </button>

      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <div className="stat-label">
            Total Sent
          </div>

          <div className="stat-value">
            {(overview?.total_sent || 0).toLocaleString()}
          </div>

          <div className="stat-desc">
            {overview?.total_campaigns || 0} campaigns
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Delivery Rate
          </div>

          <div className="stat-value">
            {overview?.delivery_rate || 0}%
          </div>

          <div className="stat-desc">
            {(overview?.total_delivered || 0).toLocaleString()} delivered
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Active Campaigns
          </div>

          <div className="stat-value">
            {overview?.active_campaigns || 0}
          </div>

          <div className="stat-desc">
            Currently running
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            Total Contacts
          </div>

          <div className="stat-value">
            {(overview?.total_contacts || 0).toLocaleString()}
          </div>

          <div className="stat-desc">
            Across all lists
          </div>
        </div>

      </div>

      <div className="dashboard-grid">

        <div className="dashboard-card large">

          <div className="dashboard-card-header">

            <div>
              <h3>Recent Campaigns</h3>

              <p>Latest messaging campaigns</p>
            </div>

            <button
              className="secondary-btn"
              onClick={() => navigate('/campaigns')}
            >
              View All
            </button>

          </div>

          {campaigns.length === 0 ? (
            <div className="empty-state">

              <h4>No Campaigns Yet</h4>

              <p>
                Create your first campaign to start sending messages.
              </p>

              <button
                className="primary-btn"
                onClick={() => navigate('/campaigns/new')}
              >
                Create Campaign
              </button>

            </div>
          ) : (
            <table className="campaign-table">

              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Recipients</th>
                  <th>Sent</th>
                  <th>Delivery</th>
                </tr>
              </thead>

              <tbody>

                {campaigns.map((c) => {
                  const pct = c.total_recipients
                    ? Math.round(
                        (c.total_delivered / c.total_recipients) * 100
                      )
                    : 0

                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                    >

                      <td className="campaign-name">
                        {c.name}
                      </td>

                      <td>
                        <span className={`status ${c.status}`}>
                          {c.status}
                        </span>
                      </td>

                      <td>
                        {(c.total_recipients || 0).toLocaleString()}
                      </td>

                      <td>
                        {(c.total_sent || 0).toLocaleString()}
                      </td>

                      <td>

                        <div className="delivery-cell">

                          <div className="delivery-bar">

                            <div
                              className="delivery-fill"
                              style={{ width: `${pct}%` }}
                            />

                          </div>

                          <span>
                            {pct}%
                          </span>

                        </div>

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>
          )}

        </div>

        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <h3>Distribution</h3>

              <p>Message routing system</p>
            </div>

          </div>

          <div className="distribution-box">

            <div className="distribution-number">
              {overview?.active_accounts || 0}
            </div>

            <div className="distribution-label">
              Accounts Connected
            </div>

            <div className="distribution-flow">
              Smart rotation distributes
              messages evenly across
              all connected accounts.
            </div>

            <div className="distribution-example">
              1000 contacts → 100 each
            </div>

          </div>

        </div>

        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>
              <h3>System Status</h3>

              <p>Platform services</p>
            </div>

          </div>

          <div className="system-status">

            <div className="system-row">
              <span>API Server</span>
              <strong>Online</strong>
            </div>

            <div className="system-row">
              <span>Message Queue</span>
              <strong>Operational</strong>
            </div>

            <div className="system-row">
              <span>Delivery Engine</span>
              <strong>Healthy</strong>
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}