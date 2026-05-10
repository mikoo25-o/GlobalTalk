import React, { useState, useEffect } from 'react'

const SECTIONS = [
  { id: 'whatsapp', label: 'WhatsApp Business API', icon: 'ti-brand-whatsapp', color: '#25D366' },
  { id: 'twilio',   label: 'Twilio SMS',            icon: 'ti-message',         color: '#8A4FFF' },
  { id: 'telegram', label: 'Telegram Bot',          icon: 'ti-brand-telegram',  color: '#2AABEE' },
  { id: 'translate',label: 'Translation APIs',      icon: 'ti-language',        color: '#53bdeb' },
  { id: 'compliance',label: 'Compliance',           icon: 'ti-shield-check',    color: '#00a884' },
]

export default function Settings() {
  const [active, setActive] = useState('whatsapp')
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Settings & API Keys</div>
        <div className="page-sub">Connect your messaging and translation services. System runs in Test Mode until keys are added.</div>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
        {/* Sidebar nav */}
        <div style={{ width: 200, flexShrink: 0 }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                marginBottom: 4, fontSize: 13,
                background: active === s.id ? 'rgba(0,168,132,0.12)' : 'transparent',
                color: active === s.id ? 'var(--green)' : 'var(--text-2)',
                fontWeight: active === s.id ? 500 : 400,
                transition: 'all 0.12s',
              }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 16, color: active === s.id ? s.color : 'inherit' }} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>

          {active === 'whatsapp' && (
            <div className="card">
              <div className="card-title">
                <span><i className="ti ti-brand-whatsapp" style={{ color: '#25D366' }} /> WhatsApp Business API</span>
              </div>
              <div style={{ background: 'rgba(255,210,121,0.08)', border: '0.5px solid rgba(255,210,121,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: 'var(--amber)' }}>
                <strong>How to get keys:</strong> Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer">developers.facebook.com</a> → My Apps → WhatsApp → API Setup. You need a verified Business account.
              </div>
              <Field label="Phone Number ID" placeholder="From Meta Developer Console" env="WHATSAPP_PHONE_NUMBER_ID" />
              <Field label="Permanent Access Token" placeholder="EAAxxxxxxxxx..." env="WHATSAPP_ACCESS_TOKEN" type="password" />
              <Field label="Webhook Verify Token" placeholder="Any random string you choose" env="WHATSAPP_WEBHOOK_VERIFY_TOKEN" />
              <StepGuide steps={[
                'Create a Meta Developer account at developers.facebook.com',
                'Create a new App → Business type',
                'Add "WhatsApp" product to your app',
                'Go to WhatsApp → API Setup',
                'Copy the Phone Number ID and generate a permanent access token',
                'Paste both values above and save',
                'Go to Accounts and toggle Test Mode OFF on your WhatsApp account',
              ]} />
              <SaveBtn onClick={save} saved={saved} />
            </div>
          )}

          {active === 'twilio' && (
            <div className="card">
              <div className="card-title">
                <span><i className="ti ti-message" style={{ color: '#8A4FFF' }} /> Twilio SMS</span>
              </div>
              <div style={{ background: 'rgba(255,210,121,0.08)', border: '0.5px solid rgba(255,210,121,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: 'var(--amber)' }}>
                <strong>How to get keys:</strong> Sign up at <a href="https://twilio.com/console" target="_blank" rel="noreferrer">twilio.com/console</a>. Free trial includes $15 credit.
              </div>
              <Field label="Account SID" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" env="TWILIO_ACCOUNT_SID" />
              <Field label="Auth Token" placeholder="Your auth token" env="TWILIO_AUTH_TOKEN" type="password" />
              <Field label="From Phone Number" placeholder="+15551234567" env="TWILIO_FROM_NUMBER" />
              <StepGuide steps={[
                'Sign up at twilio.com',
                'Go to Console Dashboard',
                'Copy your Account SID and Auth Token',
                'Buy a phone number (or use trial number)',
                'Paste all values above and save',
              ]} />
              <SaveBtn onClick={save} saved={saved} />
            </div>
          )}

          {active === 'telegram' && (
            <div className="card">
              <div className="card-title">
                <span><i className="ti ti-brand-telegram" style={{ color: '#2AABEE' }} /> Telegram Bot API</span>
              </div>
              <div style={{ background: 'rgba(255,210,121,0.08)', border: '0.5px solid rgba(255,210,121,0.2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: 'var(--amber)' }}>
                <strong>How to get keys:</strong> Open Telegram → search <strong>@BotFather</strong> → send /newbot → follow instructions.
              </div>
              <Field label="Bot Token" placeholder="1234567890:AAH..." env="TELEGRAM_BOT_TOKEN" type="password" />
              <StepGuide steps={[
                'Open Telegram app',
                'Search for @BotFather and start a chat',
                'Send /newbot',
                'Choose a name and username for your bot',
                'Copy the token BotFather gives you',
                'Paste it above and save',
              ]} />
              <SaveBtn onClick={save} saved={saved} />
            </div>
          )}

          {active === 'translate' && (
            <div className="card">
              <div className="card-title">
                <span><i className="ti ti-language" style={{ color: '#53bdeb' }} /> Translation APIs</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Google Translate</div>
                <div style={{ background: 'rgba(255,210,121,0.08)', border: '0.5px solid rgba(255,210,121,0.2)', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12, color: 'var(--amber)' }}>
                  <strong>How to get key:</strong> Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">console.cloud.google.com</a> → APIs → Cloud Translation API → Enable → Create credentials.
                </div>
                <Field label="Google Translate API Key" placeholder="AIzaSy..." env="GOOGLE_TRANSLATE_API_KEY" type="password" />
              </div>
              <div className="divider" />
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Microsoft Translator (Optional fallback)</div>
                <Field label="Microsoft Translator Key" placeholder="Ocp-Apim-Subscription-Key" env="MICROSOFT_TRANSLATOR_KEY" type="password" />
                <Field label="Region" placeholder="eastus" env="MICROSOFT_TRANSLATOR_REGION" />
              </div>
              <div style={{ background: 'rgba(0,168,132,0.08)', borderRadius: 8, padding: 12, marginTop: 12, fontSize: 12, color: 'var(--text-2)' }}>
                <i className="ti ti-info-circle" style={{ color: 'var(--green)' }} /> Without API keys, the system uses a [LANG] prefix placeholder. Add keys to enable real translation for Spanish, Chinese, French, and 8 other languages.
              </div>
              <SaveBtn onClick={save} saved={saved} />
            </div>
          )}

          {active === 'compliance' && (
            <div className="card">
              <div className="card-title">
                <span><i className="ti ti-shield-check" style={{ color: 'var(--green)' }} /> Compliance Settings</span>
              </div>
              <div style={{ fontSize: 13 }}>
                {[
                  ['Opt-in only sending', 'Only send to contacts who have opted in', true],
                  ['Auto-include STOP footer', 'Append "Reply STOP to unsubscribe" to every message', true],
                  ['Honor opt-outs immediately', 'Block number as soon as STOP is received', true],
                  ['Rate limiting enforcement', 'Respect per-account daily sending limits', true],
                  ['Delivery pacing', 'Spread sends evenly to avoid spam detection', true],
                ].map(([label, desc, checked]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <input type="checkbox" defaultChecked={checked} style={{ marginTop: 2, accentColor: 'var(--green)' }} />
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-1)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 14, padding: 12, background: 'rgba(0,168,132,0.06)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)' }}>
                  <i className="ti ti-shield" style={{ color: 'var(--green)' }} /> TransMsg is designed to comply with WhatsApp Business Policy, TCPA (US), and CAN-SPAM. Always ensure you have proper consent before sending.
                </div>
              </div>
              <SaveBtn onClick={save} saved={saved} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function Field({ label, placeholder, env, type = 'text' }) {
  const [val, setVal] = useState('')
  return (
    <div className="form-row">
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder} value={val} onChange={e => setVal(e.target.value)} />
      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
        .env key: <code style={{ fontFamily: 'var(--font-mono)' }}>{env}</code>
      </div>
    </div>
  )
}

function StepGuide({ steps }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Setup Steps</div>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6, fontSize: 12, color: 'var(--text-2)' }}>
          <span style={{ color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span>
          <span>{s}</span>
        </div>
      ))}
    </div>
  )
}

function SaveBtn({ onClick, saved }) {
  return (
    <button className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`} onClick={onClick} style={{ marginTop: 4 }}>
      {saved ? <><i className="ti ti-check" /> Saved!</> : <><i className="ti ti-device-floppy" /> Save to .env</>}
    </button>
  )
}
