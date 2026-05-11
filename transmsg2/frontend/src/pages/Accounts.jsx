import React, { useState, useEffect } from 'react'
import {
  getAccounts,
  createAccount,
  deleteAccount,
  testAccount
} from '../utils/api'

const PLATFORMS = [
  {
    value: 'whatsapp',
    label: 'WhatsApp Business API',
    icon: 'ti-brand-whatsapp',
    color: '#25D366',
  },
  {
    value: 'sms',
    label: 'Twilio SMS',
    icon: 'ti-message',
    color: '#8A4FFF',
  },
  {
    value: 'telegram',
    label: 'Telegram Bot',
    icon: 'ti-brand-telegram',
    color: '#2AABEE',
  },
]

const EMPTY = {
  name: '',
  platform: 'whatsapp',
  identifier: '',
  access_token: '',
  phone_number_id: '',
  bot_token: '',
  twilio_sid: '',
  twilio_token: '',
  from_number: '',
  daily_limit: 1000,
}

export default function Accounts() {

  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(EMPTY)

  const [showForm, setShowForm] = useState(false)

  const [loading, setLoading] = useState(false)

  const [testing, setTesting] = useState(null)

  const [testResult, setTestResult] = useState({})

  const [error, setError] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = () => {
    getAccounts()
      .then((r) => setAccounts(r.data))
      .catch(() => {})
  }

  const handleCreate = async () => {

    if (!form.name || !form.identifier) {
      setError('Name and identifier are required')
      return
    }

    setLoading(true)
    setError('')

    try {

      await createAccount(form)

      setForm(EMPTY)

      setShowForm(false)

      fetchAccounts()

    } catch (e) {

      setError(
        e.response?.data?.detail ||
        'Failed to create account'
      )

    } finally {

      setLoading(false)

    }
  }

  const handleTest = async (id) => {

    setTesting(id)

    try {

      const r = await testAccount(id)

      setTestResult((prev) => ({
        ...prev,
        [id]: r.data.result,
      }))

    } catch (e) {

      setTestResult((prev) => ({
        ...prev,
        [id]: {
          success: false,
          error: 'Test failed',
        },
      }))

    } finally {

      setTesting(null)

    }
  }

  const handleDelete = async (id) => {

    if (!confirm('Remove this account?')) return

    await deleteAccount(id)

    fetchAccounts()
  }

  return (

    <div className="dashboard-page">

      {/* HEADER */}

      <div className="dashboard-top">

        <div>

          <div className="dashboard-title">
            Sending Accounts
          </div>

          <div className="dashboard-subtitle">
            Connect WhatsApp, Telegram, and SMS platforms for large-scale messaging
          </div>

        </div>

        <button
          className="primary-btn"
          onClick={() => setShowForm(!showForm)}
        >
          + Add Account
        </button>

      </div>

      {/* STATS */}

      <div className="stats-grid">

        <div className="stat-card">

          <div className="stat-label">
            Total Accounts
          </div>

          <div className="stat-value">
            {accounts.length}
          </div>

          <div className="stat-desc">
            Connected sending platforms
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-label">
            Active Accounts
          </div>

          <div className="stat-value">
            {accounts.filter(a => a.is_active).length}
          </div>

          <div className="stat-desc">
            Ready for live sending
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-label">
            Daily Capacity
          </div>

          <div className="stat-value">
            {accounts
              .reduce((sum, a) => sum + (a.daily_limit || 0), 0)
              .toLocaleString()}
          </div>

          <div className="stat-desc">
            Messages per day
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-label">
            Connected Platforms
          </div>

          <div className="stat-value">
            {new Set(accounts.map(a => a.platform)).size}
          </div>

          <div className="stat-desc">
            Messaging integrations
          </div>

        </div>

      </div>

      {/* AUTO SPLIT */}

      {accounts.length > 0 && (

        <div
          className="dashboard-card"
          style={{
            marginBottom: 20,
            background: 'rgba(0,168,132,0.06)',
            border: '1px solid rgba(0,168,132,0.15)',
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >

            <i
              className="ti ti-git-fork"
              style={{
                fontSize: 24,
                color: 'var(--green)',
              }}
            />

            <div>

              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Auto Distribution Enabled
              </div>

              <div
                style={{
                  color: 'var(--text-2)',
                  fontSize: 13,
                }}
              >
                Messages are automatically split across all active accounts
                for simultaneous sending and improved delivery performance.
              </div>

            </div>

          </div>

        </div>

      )}

      {/* FORM */}

      {showForm && (

        <div className="dashboard-card">

          <div className="dashboard-card-header">

            <div>

              <h3>
                Add Sending Account
              </h3>

              <p>
                Configure messaging platform credentials
              </p>

            </div>

          </div>

          <div className="two-col">

            <div className="form-row">

              <label className="label">
                Account Name
              </label>

              <input
                className="input"
                placeholder="Main WhatsApp Sender"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    name: e.target.value,
                  }))
                }
              />

            </div>

            <div className="form-row">

              <label className="label">
                Platform
              </label>

              <select
                className="select"
                value={form.platform}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    platform: e.target.value,
                  }))
                }
              >

                {PLATFORMS.map((p) => (

                  <option
                    key={p.value}
                    value={p.value}
                  >
                    {p.label}
                  </option>

                ))}

              </select>

            </div>

          </div>

          <div className="form-row">

            <label className="label">
              Identifier
            </label>

            <input
              className="input"
              placeholder="+1 (555) 000-0000"
              value={form.identifier}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  identifier: e.target.value,
                }))
              }
            />

          </div>

          {form.platform === 'whatsapp' && (

            <div className="two-col">

              <div className="form-row">

                <label className="label">
                  Phone Number ID
                </label>

                <input
                  className="input"
                  placeholder="Meta phone number ID"
                  value={form.phone_number_id}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      phone_number_id: e.target.value,
                    }))
                  }
                />

              </div>

              <div className="form-row">

                <label className="label">
                  Access Token
                </label>

                <input
                  className="input"
                  type="password"
                  placeholder="Permanent access token"
                  value={form.access_token}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      access_token: e.target.value,
                    }))
                  }
                />

              </div>

            </div>

          )}

          {form.platform === 'telegram' && (

            <div className="form-row">

              <label className="label">
                Telegram Bot Token
              </label>

              <input
                className="input"
                type="password"
                placeholder="Bot token from BotFather"
                value={form.bot_token}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    bot_token: e.target.value,
                  }))
                }
              />

            </div>

          )}

          {form.platform === 'sms' && (

            <>
              <div className="two-col">

                <div className="form-row">

                  <label className="label">
                    Twilio SID
                  </label>

                  <input
                    className="input"
                    value={form.twilio_sid}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        twilio_sid: e.target.value,
                      }))
                    }
                  />

                </div>

                <div className="form-row">

                  <label className="label">
                    Twilio Token
                  </label>

                  <input
                    className="input"
                    type="password"
                    value={form.twilio_token}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        twilio_token: e.target.value,
                      }))
                    }
                  />

                </div>

              </div>

              <div className="form-row">

                <label className="label">
                  Sender Number
                </label>

                <input
                  className="input"
                  value={form.from_number}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      from_number: e.target.value,
                    }))
                  }
                />

              </div>
            </>

          )}

          <div className="form-row">

            <label className="label">
              Daily Limit
            </label>

            <input
              className="input"
              type="number"
              value={form.daily_limit}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  daily_limit: parseInt(e.target.value),
                }))
              }
            />

          </div>

          {error && (

            <div
              style={{
                color: 'var(--red)',
                marginBottom: 14,
                fontSize: 13,
              }}
            >
              {error}
            </div>

          )}

          <div
            style={{
              display: 'flex',
              gap: 10,
            }}
          >

            <button
              className="primary-btn"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Account'}
            </button>

            <button
              className="secondary-btn"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>

          </div>

        </div>

      )}

      {/* TABLE */}

      <div className="dashboard-card">

        <div className="dashboard-card-header">

          <div>

            <h3>
              Connected Accounts
            </h3>

            <p>
              Live messaging platform integrations
            </p>

          </div>

        </div>

        {accounts.length === 0 ? (

          <div className="empty-state">

            <h4>
              No Accounts Connected
            </h4>

            <p>
              Add your first sending platform to begin sending campaigns
            </p>

          </div>

        ) : (

          <table className="campaign-table">

            <thead>

              <tr>
                <th>Account</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Daily Limit</th>
                <th>Mode</th>
                <th>Actions</th>
              </tr>

            </thead>

            <tbody>

              {accounts.map((a) => {

                const plt = PLATFORMS.find(
                  p => p.value === a.platform
                )

                const tr = testResult[a.id]

                return (

                  <tr key={a.id}>

                    <td>

                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {a.name}
                      </div>

                      <div
                        style={{
                          color: 'var(--text-2)',
                          fontSize: 12,
                        }}
                      >
                        {a.identifier}
                      </div>

                    </td>

                    <td>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >

                        <i
                          className={`ti ${plt?.icon}`}
                          style={{
                            color: plt?.color,
                            fontSize: 18,
                          }}
                        />

                        <span>
                          {plt?.label}
                        </span>

                      </div>

                    </td>

                    <td>

                      <span
                        className={`status ${
                          a.is_active
                            ? 'running'
                            : 'draft'
                        }`}
                      >
                        {a.is_active
                          ? 'Active'
                          : 'Inactive'}
                      </span>

                      {tr && (

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 12,
                            color: tr.success
                              ? 'var(--green)'
                              : 'var(--red)',
                          }}
                        >
                          {tr.success
                            ? '✓ Test Passed'
                            : `✗ ${tr.error}`}
                        </div>

                      )}

                    </td>

                    <td>
                      {(a.daily_limit || 0).toLocaleString()}
                    </td>

                    <td>

                      <span
                        className={`badge ${
                          a.is_test_mode
                            ? 'badge-amber'
                            : 'badge-green'
                        }`}
                      >
                        {a.is_test_mode
                          ? 'Test Mode'
                          : 'Live'}
                      </span>

                    </td>

                    <td>

                      <div
                        style={{
                          display: 'flex',
                          gap: 8,
                        }}
                      >

                        <button
                          className="secondary-btn"
                          onClick={() => handleTest(a.id)}
                        >
                          {testing === a.id
                            ? 'Testing...'
                            : 'Test'}
                        </button>

                        <button
                          className="btn btn-danger"
                          onClick={() => handleDelete(a.id)}
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

        )}

      </div>

    </div>
  )
}