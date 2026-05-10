import React, { useState, useEffect } from 'react'
import { getAccounts, createAccount, deleteAccount, testAccount } from '../utils/api'

const PLATFORMS = [
  { value: 'whatsapp', label: 'WhatsApp Business API', icon: 'ti-brand-whatsapp', color: '#25D366' },
  { value: 'sms',      label: 'Twilio SMS',            icon: 'ti-message',         color: '#8A4FFF' },
  { value: 'telegram', label: 'Telegram Bot',          icon: 'ti-brand-telegram',  color: '#2AABEE' },
]

const EMPTY = { name: '', platform: 'whatsapp', identifier: '', access_token: '', phone_number_id: '', bot_token: '', twilio_sid: '', twilio_token: '', from_number: '', daily_limit: 1000 }

export default function Accounts() {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(null)
  const [testResult, setTestResult] = useState({})
  const [error, setError] = useState('')

  useEffect(() => { fetchAccounts() }, [])

  const fetchAccounts = () => {
    getAccounts().then(r => setAccounts(r.data)).catch(() => {})
  }

  const handleCreate = async () => {
    if (!form.name || !form.identifier) { setError('Name and identifier are required'); return }
    setLoading(true); setError('')
    try {
      await createAccount(form)
      setForm(EMPTY); setShowForm(false); fetchAccounts()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to create account')
    } finally { setLoading(false) }
  }

  const handleTest = async (id) => {
    setTesting(id)
    try {
      const r = await testAccount(id)
      setTestResult(prev => ({ ...prev, [id]: r.data.result }))
    } catch (e) {
      setTestResult(prev => ({ ...prev, [id]: { success: false, error: 'Test failed' } }))
    } finally { setTesting(null) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this account?')) return
    await deleteAccount(id)
    fetchAccounts()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Sending Accounts</div>
        <div className="page-sub">Connect WhatsApp, Telegram, or SMS accounts. Numbers are auto-split across all active accounts.</div>
      </div>

      {/* Split preview info */}
      {accounts.length > 0 && (
        <div className="card" style={{ marginBottom: 14, background: 'rgba(0,168,132,0.06)', border: '0.5px solid rgba(0,168,132,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="ti ti-git-fork" style={{ fontSize: 22, color: 'var(--green)' }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Auto-Split is Active</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                With <strong>{accounts.filter(a => a.is_active).length} active accounts</strong>, uploading 10,000 numbers will assign{' '}
                <span className="split-tag">~{Math.ceil(10000 / Math.max(accounts.filter(a => a.is_active).length, 1)).toLocaleString()}</span>{' '}
                numbers to each account for simultaneous sending.
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <i className="ti ti-plus" /> Add Account
        </button>
      </div>

      {/* Add account form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title">Add Sending Account</div>

          <div className="two-col">
            <div className="form-row">
              <label className="label">Account Name</label>
              <input className="input" placeholder="e.g. Main WhatsApp US" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-row">
              <label className="label">Platform</label>
              <select className="select" value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}>
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="label">Identifier (phone number or username)</label>
            <input className="input" placeholder={form.platform === 'telegram' ? '@yourbotname' : '+1 (555) 000-0000'}
              value={form.identifier} onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))} />
          </div>

          {form.platform === 'whatsapp' && (
            <div className="two-col">
              <div className="form-row">
                <label className="label">Phone Number ID</label>
                <input className="input" placeholder="From Meta Business Manager" value={form.phone_number_id} onChange={e => setForm(p => ({ ...p, phone_number_id: e.target.value }))} />
              </div>
              <div className="form-row">
                <label className="label">Access Token</label>
                <input className="input" type="password" placeholder="Permanent access token" value={form.access_token} onChange={e => setForm(p => ({ ...p, access_token: e.target.value }))} />
              </div>
            </div>
          )}

          {form.platform === 'sms' && (
            <>
              <div className="two-col">
                <div className="form-row">
                  <label className="label">Twilio Account SID</label>
                  <input className="input" placeholder="ACxxxxxxxx" value={form.twilio_sid} onChange={e => setForm(p => ({ ...p, twilio_sid: e.target.value }))} />
                </div>
                <div className="form-row">
                  <label className="label">Twilio Auth Token</label>
                  <input className="input" type="password" value={form.twilio_token} onChange={e => setForm(p => ({ ...p, twilio_token: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <label className="label">From Number</label>
                <input className="input" placeholder="+1 (555) 000-0000" value={form.from_number} onChange={e => setForm(p => ({ ...p, from_number: e.target.value }))} />
              </div>
            </>
          )}

          {form.platform === 'telegram' && (
            <div className="form-row">
              <label className="label">Bot Token (from @BotFather)</label>
              <input className="input" type="password" placeholder="1234567890:AAH..." value={form.bot_token} onChange={e => setForm(p => ({ ...p, bot_token: e.target.value }))} />
            </div>
          )}

          <div className="form-row">
            <label className="label">Daily Send Limit</label>
            <input className="input" type="number" value={form.daily_limit} onChange={e => setForm(p => ({ ...p, daily_limit: parseInt(e.target.value) }))} />
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}><i className="ti ti-alert-circle" /> {error}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
              {loading ? 'Saving...' : 'Save Account'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Account list */}
      <div className="card">
        <div className="card-title">Connected Accounts ({accounts.length})</div>
        {accounts.length === 0 ? (
          <div style={{ color: 'var(--text-2)', textAlign: 'center', padding: '20px 0' }}>
            No accounts yet. Add your first sending account above.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Account</th><th>Platform</th><th>Mode</th><th>Daily Limit</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {accounts.map(a => {
                const plt = PLATFORMS.find(p => p.value === a.platform)
                const tr = testResult[a.id]
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{a.identifier}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <i className={`ti ${plt?.icon}`} style={{ color: plt?.color, fontSize: 16 }} />
                        <span style={{ fontSize: 12 }}>{plt?.label}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${a.is_test_mode ? 'badge-amber' : 'badge-green'}`}>
                        {a.is_test_mode ? 'Test Mode' : 'Live'}
                      </span>
                    </td>
                    <td>{(a.daily_limit || 0).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${a.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {a.is_active ? '● Active' : '○ Inactive'}
                      </span>
                      {tr && (
                        <div style={{ fontSize: 11, marginTop: 3, color: tr.success ? 'var(--green)' : 'var(--red)' }}>
                          {tr.success ? '✓ Test passed' : `✗ ${tr.error}`}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleTest(a.id)} disabled={testing === a.id}>
                          {testing === a.id ? '...' : 'Test'}
                        </button>
                        <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => handleDelete(a.id)}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
