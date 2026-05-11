import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  getCampaigns,
  deleteCampaign,
  launchCampaign,
  pauseCampaign,
  duplicateCampaign,
  retryFailedCampaign,
  cancelCampaign
} from '../utils/api'

export default function Campaigns() {

  const navigate = useNavigate()

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = () => {

    setLoading(true)

    getCampaigns()
      .then((r) => setCampaigns(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
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

  const handleRetry = async (id, e) => {
    e.stopPropagation()
    await retryFailedCampaign(id)
    fetchCampaigns()
  }

  const handleDuplicate = async (id, e) => {
    e.stopPropagation()
    await duplicateCampaign(id)
    fetchCampaigns()
  }

  const handleCancel = async (id, e) => {
    e.stopPropagation()

    if (!window.confirm('Cancel this campaign?')) return

    await cancelCampaign(id)
    fetchCampaigns()
  }

  const handleDelete = async (id, e) => {

    e.stopPropagation()

    if (!window.confirm('Delete this campaign permanently?')) {
      return
    }

    await deleteCampaign(id)

    fetchCampaigns()
  }

  const filteredCampaigns = campaigns.filter((c) => {

    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === 'all'
        ? true
        : c.status === filter

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    failed: campaigns.filter(c => c.status === 'failed').length
  }

  return (
    <div className="dashboard-page">

      {/* TOP */}

      <div className="dashboard-top">

        <div>

          <h1 className="dashboard-title">
            Campaigns
          </h1>

          <p className="dashboard-subtitle">
            Manage multilingual delivery campaigns and monitor performance
          </p>

        </div>

        <button
          className="primary-btn"
          onClick={() => navigate('/campaigns/new')}
        >
          <i className="ti ti-plus" />
          New Campaign
        </button>

      </div>

      {/* STATS */}

      <div className="metrics-grid">

        <Metric
          icon="ti-speakerphone"
          label="Total Campaigns"
          value={stats.total}
        />

        <Metric
          icon="ti-player-play"
          label="Running"
          value={stats.running}
        />

        <Metric
          icon="ti-circle-check"
          label="Completed"
          value={stats.completed}
        />

        <Metric
          icon="ti-alert-triangle"
          label="Failed"
          value={stats.failed}
        />

      </div>

      {/* FILTERS */}

      <div
        className="dashboard-card"
        style={{ marginBottom: 22 }}
      >

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'center'
          }}
        >

          <div
            style={{
              position: 'relative',
              width: 320
            }}
          >

            <i
              className="ti ti-search"
              style={{
                position: 'absolute',
                left: 14,
                top: 13,
                color: '#64748b'
              }}
            />

            <input
              type="text"
              className="input"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: 40
              }}
            />

          </div>

          <div
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap'
            }}
          >

            {[
              'all',
              'draft',
              'running',
              'paused',
              'completed',
              'failed'
            ].map(status => (

              <button
                key={status}
                className={
                  filter === status
                    ? 'primary-btn'
                    : 'secondary-btn'
                }
                onClick={() => setFilter(status)}
                style={{
                  textTransform: 'capitalize'
                }}
              >
                {status}
              </button>

            ))}

          </div>

        </div>

      </div>

      {/* CONTENT */}

      {loading ? (

        <div className="dashboard-card">

          <div className="loading-box">
            Loading campaigns...
          </div>

        </div>

      ) : filteredCampaigns.length === 0 ? (

        <div className="dashboard-card">

          <div className="empty-state">

            <i
              className="ti ti-speakerphone"
              style={{
                fontSize: 58,
                color: '#64748b',
                marginBottom: 20
              }}
            />

            <h3>
              No Campaigns Found
            </h3>

            <p>
              Create your first campaign to begin sending multilingual messages.
            </p>

            <button
              className="primary-btn"
              onClick={() => navigate('/campaigns/new')}
            >
              <i className="ti ti-plus" />
              Create Campaign
            </button>

          </div>

        </div>

      ) : (

        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>

              <h3>
                Campaign Manager
              </h3>

              <p>
                Monitor campaign delivery, status and engagement
              </p>

            </div>

          </div>

          <table className="campaign-table">

            <thead>

              <tr>
                <th>Campaign</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Delivered</th>
                <th>Progress</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {filteredCampaigns.map((c) => {

                const pct = c.total_recipients
                  ? Math.round(
                      ((c.total_delivered || 0) / c.total_recipients) * 100
                    )
                  : 0

                return (

                  <tr
                    key={c.id}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    style={{
                      cursor: 'pointer'
                    }}
                  >

                    <td>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >

                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 12,
                            background: 'rgba(0,168,132,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >

                          <i
                            className="ti ti-speakerphone"
                            style={{
                              color: 'var(--green)',
                              fontSize: 18
                            }}
                          />

                        </div>

                        <div>

                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 14
                            }}
                          >
                            {c.name}
                          </div>

                          <div
                            style={{
                              color: '#94a3b8',
                              fontSize: 12,
                              marginTop: 4
                            }}
                          >
                            {c.languages?.join(', ') || 'No languages'}
                            {' • '}
                            {new Date(c.created_at).toLocaleDateString()}
                          </div>

                        </div>

                      </div>

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
                      {(c.total_delivered || 0).toLocaleString()}
                    </td>

                    <td>

                      <div className="delivery-cell">

                        <div className="delivery-bar">

                          <div
                            className="delivery-fill"
                            style={{
                              width: `${pct}%`
                            }}
                          />

                        </div>

                        <span>
                          {pct}%
                        </span>

                      </div>

                    </td>

                    <td>

                      <span
                        className={`badge ${
                          c.test_mode
                            ? 'badge-amber'
                            : 'badge-green'
                        }`}
                      >
                        {c.test_mode ? 'Test' : 'Live'}
                      </span>

                    </td>

                    <td
                      onClick={(e) => e.stopPropagation()}
                    >

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                          flexWrap: 'wrap'
                        }}
                      >

                        {c.status === 'draft' && (

                          <button
                            className="primary-btn"
                            style={{
                              padding: '8px 12px',
                              fontSize: 12
                            }}
                            onClick={(e) => handleLaunch(c.id, e)}
                          >
                            <i className="ti ti-player-play" />
                          </button>

                        )}

                        {c.status === 'running' && (

                          <>
                            <button
                              className="secondary-btn"
                              style={{
                                padding: '8px 12px',
                                fontSize: 12
                              }}
                              onClick={(e) => handlePause(c.id, e)}
                            >
                              <i className="ti ti-player-pause" />
                            </button>

                            <button
                              className="secondary-btn"
                              style={{
                                padding: '8px 12px',
                                fontSize: 12
                              }}
                              onClick={(e) => handleCancel(c.id, e)}
                            >
                              <i className="ti ti-square-x" />
                            </button>
                          </>

                        )}

                        {c.status === 'failed' && (

                          <button
                            className="secondary-btn"
                            style={{
                              padding: '8px 12px',
                              fontSize: 12
                            }}
                            onClick={(e) => handleRetry(c.id, e)}
                          >
                            <i className="ti ti-refresh" />
                          </button>

                        )}

                        <button
                          className="secondary-btn"
                          style={{
                            padding: '8px 12px',
                            fontSize: 12
                          }}
                          onClick={(e) => handleDuplicate(c.id, e)}
                        >
                          <i className="ti ti-copy" />
                        </button>

                        <button
                          className="btn btn-danger"
                          style={{
                            padding: '8px 12px',
                            fontSize: 12
                          }}
                          onClick={(e) => handleDelete(c.id, e)}
                        >
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

function Metric({ icon, label, value }) {

  return (

    <div className="metric">

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 10
        }}
      >

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'rgba(0,168,132,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >

          <i
            className={`ti ${icon}`}
            style={{
              fontSize: 18,
              color: 'var(--green)'
            }}
          />

        </div>

        <div
          style={{
            color: '#94a3b8',
            fontSize: 13
          }}
        >
          {label}
        </div>

      </div>

      <div className="metric-value">
        {value}
      </div>

    </div>

  )
}