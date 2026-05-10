import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCampaign, getProgress, launchCampaign, pauseCampaign, getDeliveryLogs } from '../utils/api'

const STATUS_COLOR = {
  running: 'var(--green)', completed: 'var(--text-2)',
  paused: 'var(--amber)', failed: 'var(--red)', pending: 'var(--text-3)'
}

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [progress, setProgress] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)

  useEffect(() => {
    loadAll()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [id])

  const loadAll = async () => {
    try {
      const [c, p, l] = await Promise.all([getCampaign(id), getProgress(id), getDeliveryLogs(id)])
      setCampaign(c.data)
      setProgress(p.data)
      setLogs(l.data.slice(0, 20))
      // Auto-poll every 2s if running
      if (p.data.status === 'running') {
        pollRef.current = setInterval(() => refreshProgress(), 2000)
      }
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  const refreshProgress = async () => {
    try {
      const [p, l] = await Promise.all([getProgress(id), getDeliveryLogs(id)])
      setProgress(p.data)
      setLogs(l.data.slice(0, 20))
      if (p.data.status !== 'running') {
        clearInterval(pollRef.current)
      }
    } catch (e) {}
  }

  const handleLaunch = async () => {
    await launchCampaign(id)
    loadAll()
  }

  const handlePause = async () => {
    await pauseCampaign(id)
    refreshProgress()
  }

  if (loading) return <div style={{ color: 'var(--text-2)', padding: 40 }}>Loading...</div>
  if (!campaign) return <div style={{ color: 'var(--red)', padding: 40 }}>Campaign not found</div>

  const camp = campaign.campaign || campaign
  const assignments = campaign.assignments || []
  const prog = progress || {}

  const deliveryRate = prog.total_recipients
    ? Math.round((prog.total_delivered || 0) / prog.total_recipients * 100)
    : 0

  const STATUS_LOG = {
    delivered: <span style={{ color: 'var(--green)' }}>✓ Delivered</span>,
    sent:      <span style={{ color: 'var(--blue-tick, #53bdeb)' }}>✓ Sent</span>,
    failed:    <span style={{ color: 'var(--red)' }}>✗ Failed</span>,
    pending:   <span style={{ color: 'var(--text-3)' }}>⏳ Pending</span>,
    opted_out: <span style={{ color: 'var(--amber)' }}>⊘ Opted out</span>,
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => navigate('/campaigns')}>
          <i className="ti ti-arrow-left" />
        </button>
        <div>
          <div className="page-title">{camp.name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span className={`badge ${camp.test_mode ? 'badge-amber' : 'badge-green'}`}>
              {camp.test_mode ? '🧪 Test Mode' : '🟢 Live'}
            </span>
            <span className="badge badge-gray">{camp.languages?.join(', ')}</span>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
              Created {new Date(camp.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {prog.status === 'draft' && (
            <button className="btn btn-primary" onClick={handleLaunch}>
              <i className="ti ti-rocket" /> Launch Campaign
            </button>
          )}
          {prog.status === 'running' && (
            <button className="btn btn-secondary" onClick={handlePause}>
              <i className="ti ti-player-pause" /> Pause
            </button>
          )}
        </div>
      </div>

      {/* Overall progress */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Recipients', value: (prog.total_recipients || 0).toLocaleString() },
          { label: 'Sent',             value: (prog.total_sent || 0).toLocaleString() },
          { label: 'Delivered',        value: (prog.total_delivered || 0).toLocaleString(), sub: `${deliveryRate}% rate`, cls: deliveryRate > 95 ? 'up' : '' },
          { label: 'Failed',           value: (prog.total_failed || 0).toLocaleString(), cls: (prog.total_failed || 0) > 0 ? 'down' : '' },
        ].map(m => (
          <div className="metric" key={m.label}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value">{m.value}</div>
            {m.sub && <div className={`metric-sub ${m.cls || ''}`}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
          <span style={{ fontWeight: 500 }}>Overall Progress</span>
          <span style={{ color: 'var(--text-2)' }}>{prog.progress_pct || 0}%</span>
        </div>
        <div className="progress" style={{ height: 10 }}>
          <div className="progress-fill" style={{ width: `${prog.progress_pct || 0}%` }} />
        </div>
        {prog.status === 'running' && (
          <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-loader-2" /> Sending in progress — auto-refreshing every 2 seconds...
          </div>
        )}
      </div>

      {/* Per-account progress */}
      {assignments.length > 0 && (
        <div className="card">
          <div className="card-title">Per-Account Progress (Parallel Sending)</div>
          {assignments.map((a, i) => {
            const pct = a.recipient_count ? Math.round((a.sent_count || 0) / a.recipient_count * 100) : 0
            return (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className={`ti ${a.account_platform === 'whatsapp' ? 'ti-brand-whatsapp' : a.account_platform === 'telegram' ? 'ti-brand-telegram' : 'ti-message'}`}
                      style={{ fontSize: 16, color: a.account_platform === 'whatsapp' ? '#25D366' : a.account_platform === 'telegram' ? '#2AABEE' : '#8A4FFF' }} />
                    <span style={{ fontWeight: 500 }}>{a.account_name || 'Account'}</span>
                    <span style={{ color: STATUS_COLOR[a.status], fontSize: 11 }}>● {a.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {(a.sent_count || 0).toLocaleString()} / {(a.recipient_count || 0).toLocaleString()} · {pct}%
                  </div>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: a.account_platform === 'telegram' ? '#2AABEE' : a.account_platform === 'sms' ? '#8A4FFF' : 'var(--green)' }} />
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 11, color: 'var(--text-3)' }}>
                  <span style={{ color: 'var(--green)' }}>✓ {(a.delivered_count || 0).toLocaleString()} delivered</span>
                  {(a.failed_count || 0) > 0 && <span style={{ color: 'var(--red)' }}>✗ {a.failed_count} failed</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Message preview */}
      <div className="card">
        <div className="card-title">Message</div>
        <div style={{ background: 'var(--bg-input)', borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.6, color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>
          {camp.message_body}
        </div>
      </div>

      {/* Delivery logs */}
      <div className="card">
        <div className="card-title">
          Delivery Log (last 20)
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 400 }}>
            {prog.status === 'running' ? ' — live updating' : ''}
          </span>
        </div>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--text-2)', fontSize: 13 }}>No delivery logs yet. Launch the campaign to start sending.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Phone</th><th>Status</th><th>Language</th><th>Time</th><th>Message ID</th></tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{log.recipient_phone}</td>
                  <td>{STATUS_LOG[log.status] || log.status}</td>
                  <td><span className="badge badge-gray">{log.language?.toUpperCase()}</span></td>
                  <td style={{ color: 'var(--text-2)', fontSize: 11 }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
                    {log.platform_message_id || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
