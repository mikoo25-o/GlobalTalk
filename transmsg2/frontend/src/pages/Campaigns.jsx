import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCampaigns, deleteCampaign, launchCampaign, pauseCampaign } from '../utils/api'

const STATUS_BADGE = {
  running:   <span className="badge badge-green">● Running</span>,
  completed: <span className="badge badge-gray">✓ Completed</span>,
  scheduled: <span className="badge badge-amber">◷ Scheduled</span>,
  paused:    <span className="badge badge-amber">⏸ Paused</span>,
  draft:     <span className="badge badge-gray">○ Draft</span>,
  failed:    <span className="badge badge-red">✗ Failed</span>,
}

export default function Campaigns() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchCampaigns() }, [])

  const fetchCampaigns = () => {
    setLoading(true)
    getCampaigns().then(r => setCampaigns(r.data)).catch(() => {}).finally(() => setLoading(false))
  }

  const handleLaunch = async (id, e) => {
    e.stopPropagation()
    await launchCampaign(id)
    fetchCampaigns()
  }

  const handlePause = async (id, e) => {
    e.stopPropagation()
    await pauseCampaign(id)
    fetchCampaigns()
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this campaign and all its data?')) return
    await deleteCampaign(id)
    fetchCampaigns()
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Campaigns</div>
          <div className="page-sub">Create, schedule and monitor bulk messaging campaigns</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/campaigns/new')}>
          <i className="ti ti-plus" /> New Campaign
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-2)', textAlign: 'center', padding: 40 }}>Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <i className="ti ti-speakerphone" style={{ fontSize: 40, color: 'var(--text-3)' }} />
          <div style={{ fontSize: 16, fontWeight: 500, marginTop: 12 }}>No campaigns yet</div>
          <div style={{ color: 'var(--text-2)', fontSize: 13, margin: '8px 0 16px' }}>
            Upload your contact numbers first, then create a campaign
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/upload')}>
            <i className="ti ti-upload" /> Upload Numbers
          </button>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Sent</th>
                <th>Delivered</th>
                <th>Rate</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const pct = c.total_recipients
                  ? Math.round((c.total_delivered || 0) / c.total_recipients * 100)
                  : 0
                return (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/campaigns/${c.id}`)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                        {c.languages?.join(', ')} · {new Date(c.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>{STATUS_BADGE[c.status] || c.status}</td>
                    <td>{(c.total_recipients || 0).toLocaleString()}</td>
                    <td>{(c.total_sent || 0).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress" style={{ width: 50 }}>
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{pct}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${c.test_mode ? 'badge-amber' : 'badge-green'}`}>
                        {c.test_mode ? 'Test' : 'Live'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                        {c.status === 'draft' && (
                          <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={e => handleLaunch(c.id, e)}>
                            <i className="ti ti-rocket" /> Launch
                          </button>
                        )}
                        {c.status === 'running' && (
                          <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={e => handlePause(c.id, e)}>
                            <i className="ti ti-player-pause" /> Pause
                          </button>
                        )}
                        {c.status === 'paused' && (
                          <button className="btn btn-primary" style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={e => handleLaunch(c.id, e)}>
                            <i className="ti ti-player-play" /> Resume
                          </button>
                        )}
                        <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={e => handleDelete(c.id, e)}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
