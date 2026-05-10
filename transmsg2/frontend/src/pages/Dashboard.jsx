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

  const STATUS_BADGE = {
    running:   <span className="badge badge-green">● Running</span>,
    completed: <span className="badge badge-gray">✓ Completed</span>,
    scheduled: <span className="badge badge-amber">◷ Scheduled</span>,
    paused:    <span className="badge badge-amber">⏸ Paused</span>,
    draft:     <span className="badge badge-gray">Draft</span>,
    failed:    <span className="badge badge-red">Failed</span>,
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-sub">Real-time overview of your messaging operations</div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-2)', textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : (
        <>
          <div className="metrics-grid">
            <div className="metric">
              <div className="metric-label">Total Sent</div>
              <div className="metric-value">{(overview?.total_sent || 0).toLocaleString()}</div>
              <div className="metric-sub">{overview?.total_campaigns || 0} campaigns</div>
            </div>
            <div className="metric">
              <div className="metric-label">Delivery Rate</div>
              <div className="metric-value">{overview?.delivery_rate || 0}%</div>
              <div className={`metric-sub ${(overview?.delivery_rate || 0) > 95 ? 'up' : ''}`}>
                {(overview?.total_delivered || 0).toLocaleString()} delivered
              </div>
            </div>
            <div className="metric">
              <div className="metric-label">Active Campaigns</div>
              <div className="metric-value">{overview?.active_campaigns || 0}</div>
              <div className="metric-sub">Currently running</div>
            </div>
            <div className="metric">
              <div className="metric-label">Total Contacts</div>
              <div className="metric-value">{(overview?.total_contacts || 0).toLocaleString()}</div>
              <div className="metric-sub">Across all lists</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              Recent Campaigns
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}
                onClick={() => navigate('/campaigns')}>View all</button>
            </div>
            {campaigns.length === 0 ? (
              <div style={{ color: 'var(--text-2)', padding: '20px 0', textAlign: 'center' }}>
                No campaigns yet. <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => navigate('/campaigns/new')}>Create one</button>
              </div>
            ) : (
              <table className="table">
                <thead><tr><th>Name</th><th>Status</th><th>Recipients</th><th>Sent</th><th>Delivery %</th></tr></thead>
                <tbody>
                  {campaigns.map(c => {
                    const pct = c.total_recipients ? Math.round(c.total_delivered / c.total_recipients * 100) : 0
                    return (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${c.id}`)}>
                        <td><strong style={{ fontWeight: 500 }}>{c.name}</strong></td>
                        <td>{STATUS_BADGE[c.status] || c.status}</td>
                        <td>{(c.total_recipients || 0).toLocaleString()}</td>
                        <td>{(c.total_sent || 0).toLocaleString()}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="progress" style={{ width: 60 }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ borderLeft: '3px solid var(--amber)', borderRadius: '0 10px 10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <i className="ti ti-test-pipe" style={{ fontSize: 20, color: 'var(--amber)' }} />
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>Test Mode is Active</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  Messages are simulated — no real messages sent. Go to Settings to add your API keys and go live.
                </div>
              </div>
              <button className="btn btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => navigate('/settings')}>
                Add API Keys
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
