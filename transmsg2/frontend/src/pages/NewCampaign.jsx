import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import {
  getLists,
  getAccounts,
  createCampaign,
  launchCampaign,
  getTemplates
} from '../utils/api'

const MAX_MESSAGE_LENGTH = 4096

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'es', flag: '🇲🇽', name: 'Spanish' },
  { code: 'zh', flag: '🇨🇳', name: 'Chinese' },
  { code: 'fr', flag: '🇫🇷', name: 'French' },
  { code: 'de', flag: '🇩🇪', name: 'German' },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese' },
  { code: 'vi', flag: '🇻🇳', name: 'Vietnamese' },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic' },
]

export default function NewCampaign() {

  const navigate = useNavigate()
  const location = useLocation()

  const [lists, setLists] = useState([])
  const [accounts, setAccounts] = useState([])
  const [templates, setTemplates] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)

  const [form, setForm] = useState({
    name: '',
    message_body: '',
    recipient_list_id: location.state?.list_id || '',
    languages: ['en'],
    rate_per_minute: 1000,
    optin_only: true,
    test_mode: true,
  })

  useEffect(() => {

    Promise.all([
      getLists(),
      getAccounts(),
      getTemplates()
    ])
      .then(([l, a, t]) => {

        setLists(
          (l.data || []).filter(
            x => x.status === 'ready'
          )
        )

        setAccounts(
          (a.data || []).filter(
            x => x.is_active
          )
        )

        setTemplates(t.data || [])

      })
      .catch(() => {})

  }, [])

  const selectedList = lists.find(
    l => String(l.id) === String(form.recipient_list_id)
  )

  const perAccount =
    selectedList && accounts.length
      ? Math.ceil(
          selectedList.valid_count /
          accounts.length
        )
      : 0

  const toggleLang = (code) => {

    if (code === 'en') return

    setForm(p => ({
      ...p,
      languages: p.languages.includes(code)
        ? p.languages.filter(l => l !== code)
        : [...p.languages, code]
    }))
  }

  const handleCreate = async (launch = false) => {

    if (
      !form.name ||
      !form.message_body ||
      !form.recipient_list_id
    ) {

      setError(
        'Please fill in campaign name, message, and select a recipient list'
      )

      return
    }

    if (accounts.length === 0) {

      setError(
        'No active accounts. Go to Accounts and add at least one.'
      )

      return
    }

    setLoading(true)
    setError('')

    try {

      const r = await createCampaign(form)

      setPreview(r.data)

      const campaignId =
        r.data.campaign_id ||
        r.data.id

      if (launch && campaignId) {

        await launchCampaign(campaignId)

        navigate(`/campaigns/${campaignId}`)
      }

    } catch (e) {

      setError(
        e.response?.data?.detail ||
        'Failed to create campaign'
      )

    } finally {

      setLoading(false)
    }
  }

  return (

    <div>

      <div className="page-header">

        <div className="page-title">
          New Campaign
        </div>

        <div className="page-sub">
          Configure your bulk message, select recipients, and launch
        </div>

      </div>

      {accounts.length === 0 && (

        <div
          className="card"
          style={{
            borderLeft: '3px solid var(--red)',
            marginBottom: 14
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}
          >

            <i
              className="ti ti-alert-circle"
              style={{
                color: 'var(--red)',
                fontSize: 20
              }}
            />

            <div>

              <div style={{ fontWeight: 500 }}>
                No active accounts
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-2)'
                }}
              >
                You need at least one sending account before launching a campaign.
              </div>

            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ marginLeft: 'auto' }}
              onClick={() => navigate('/accounts')}
            >
              Add Account
            </button>

          </div>

        </div>

      )}

      <div
        className="two-col"
        style={{
          gap: 16,
          alignItems: 'start'
        }}
      >

        <div>

          <div className="card">

            <div className="card-title">
              Message
            </div>

            {templates.length > 0 && (

              <div className="form-row">

                <label className="label">
                  Start from template
                </label>

                <select
                  className="select"
                  onChange={e => {

                    const t = templates.find(
                      t =>
                        String(t.id) ===
                        String(e.target.value)
                    )

                    if (t) {

                      setForm(p => ({
                        ...p,
                        message_body:
                          t.body ||
                          t.message_body ||
                          '',
                        name: p.name || t.name
                      }))
                    }
                  }}
                >

                  <option value="">
                    — Select template —
                  </option>

                  {templates.map(t => (

                    <option
                      key={t.id}
                      value={t.id}
                    >
                      {t.name}
                    </option>

                  ))}

                </select>

              </div>

            )}

            {templates.length === 0 && (

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-3)',
                  marginBottom: 14
                }}
              >
                No templates available yet
              </div>

            )}

            <div className="form-row">

              <label className="label">
                Campaign Name
              </label>

              <input
                className="input"
                placeholder="e.g. Summer Sale — June 2026"
                value={form.name}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    name: e.target.value
                  }))
                }
              />

            </div>

            <div className="form-row">

              <label className="label">
                Message Body
              </label>

              <textarea
                className="input"
                rows={5}
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Type your message. Use {{name}}, {{link}}, {{date}} as placeholders."
                value={form.message_body}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    message_body: e.target.value
                  }))
                }
                style={{
                  resize: 'vertical'
                }}
              />

              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-3)',
                  marginTop: 4
                }}
              >
                {form.message_body.length} chars · Include "Reply STOP to unsubscribe" for compliance
              </div>

            </div>

            <div className="form-row">

              <label className="label">
                Translate to
              </label>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >

                {LANGUAGES.map(l => (

                  <button
                    key={l.code}
                    type="button"
                    className={`btn ${
                      form.languages.includes(l.code)
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px'
                    }}
                    onClick={() => toggleLang(l.code)}
                  >
                    {l.flag} {l.name}
                  </button>

                ))}

              </div>

            </div>

          </div>

        </div>

        <div>

          <div className="card">

            <div className="card-title">
              Recipients & Settings
            </div>

            <div className="form-row">

              <label className="label">
                Recipient List
              </label>

              <select
                className="select"
                value={form.recipient_list_id}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    recipient_list_id: e.target.value
                  }))
                }
              >

                <option value="">
                  — Select list —
                </option>

                {lists.map(l => (

                  <option
                    key={l.id}
                    value={l.id}
                  >
                    {l.name} ({l.valid_count?.toLocaleString()} contacts)
                  </option>

                ))}

              </select>

              {lists.length === 0 && (

                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--amber)',
                    marginTop: 6
                  }}
                >

                  <i className="ti ti-upload" />

                  {' '}No ready lists.

                  {' '}

                  <span
                    style={{
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                    onClick={() => navigate('/upload')}
                  >
                    Upload numbers first
                  </span>

                </div>

              )}

            </div>

            {selectedList && accounts.length > 0 && (

              <div
                style={{
                  background: 'rgba(0,168,132,0.06)',
                  border: '0.5px solid rgba(0,168,132,0.2)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 14
                }}
              >

                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 12,
                    color: 'var(--green)',
                    marginBottom: 8
                  }}
                >
                  <i className="ti ti-git-fork" />
                  {' '}Auto-Split Preview
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-2)'
                  }}
                >
                  {selectedList.valid_count?.toLocaleString()} numbers ÷ {accounts.length} accounts
                </div>

                {accounts.map(a => (

                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 6,
                      fontSize: 12
                    }}
                  >

                    <span
                      style={{
                        color: 'var(--text-1)'
                      }}
                    >
                      {a.name}
                    </span>

                    <span className="split-tag">
                      ~{perAccount.toLocaleString()} msgs
                    </span>

                  </div>

                ))}

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: 'var(--text-3)'
                  }}
                >
                  All accounts send simultaneously
                </div>

              </div>

            )}

            <div className="form-row">

              <label className="label">
                Send Rate (per minute per account)
              </label>

              <select
                className="select"
                value={form.rate_per_minute}
                onChange={e =>
                  setForm(p => ({
                    ...p,
                    rate_per_minute: parseInt(e.target.value || 0)
                  }))
                }
              >

                <option value={100}>
                  100 / minute (safe warm-up)
                </option>

                <option value={500}>
                  500 / minute
                </option>

                <option value={1000}>
                  1,000 / minute
                </option>

                <option value={2000}>
                  2,000 / minute
                </option>

              </select>

            </div>

            <div className="form-row">

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >

                <input
                  type="checkbox"
                  checked={form.optin_only}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      optin_only: e.target.checked
                    }))
                  }
                />

                Only send to opted-in contacts

              </label>

            </div>

            <div className="form-row">

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >

                <input
                  type="checkbox"
                  checked={form.test_mode}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      test_mode: e.target.checked
                    }))
                  }
                />

                <span>
                  Test Mode
                  {' '}
                  <span
                    style={{
                      color: 'var(--amber)',
                      fontSize: 11
                    }}
                  >
                    (simulate sending, no real messages)
                  </span>
                </span>

              </label>

            </div>

            {error && (

              <div
                style={{
                  color: 'var(--red)',
                  fontSize: 13,
                  marginBottom: 10
                }}
              >

                <i className="ti ti-alert-circle" />
                {' '}
                {error}

              </div>

            )}

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 4
              }}
            >

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleCreate(false)}
                disabled={loading}
              >
                Save Draft
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleCreate(true)}
                disabled={
                  loading ||
                  accounts.length === 0
                }
              >

                {loading ? (

                  <>
                    <i className="ti ti-loader-2" />
                    {' '}
                    Creating...
                  </>

                ) : (

                  <>
                    <i className="ti ti-rocket" />
                    {' '}
                    Launch Now
                  </>

                )}

              </button>

            </div>

          </div>

          {preview && (

            <div
              className="card"
              style={{
                border: '0.5px solid rgba(0,168,132,0.3)'
              }}
            >

              <div
                style={{
                  fontWeight: 500,
                  color: 'var(--green)',
                  marginBottom: 10
                }}
              >

                <i className="ti ti-circle-check" />
                {' '}
                Campaign created

              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-2)',
                  lineHeight: 1.8
                }}
              >

                <div>
                  {preview.total_recipients?.toLocaleString()} recipients
                </div>

                <div>
                  {preview.accounts_available} accounts ready
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--green)'
                  }}
                >
                  {preview.split_preview}
                </div>

              </div>

              <button
                type="button"
                className="btn btn-primary"
                style={{
                  marginTop: 12,
                  width: '100%'
                }}
                onClick={async () => {

                  setLoading(true)

                  const campaignId =
                    preview.campaign_id ||
                    preview.id

                  await launchCampaign(campaignId)

                  navigate(`/campaigns/${campaignId}`)
                }}
              >

                <i className="ti ti-rocket" />
                {' '}
                Launch Campaign

              </button>

            </div>

          )}

        </div>

      </div>

    </div>
  )
}