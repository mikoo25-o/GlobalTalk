import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadFile, pasteNumbers, getLists, deleteList } from '../utils/api'

export default function Upload() {
  const navigate = useNavigate()
  const fileRef = useRef()
  const [tab, setTab] = useState('file') // 'file' | 'paste'
  const [listName, setListName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [lists, setLists] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => { fetchLists() }, [])

  const fetchLists = () => {
    getLists().then(r => setLists(r.data)).catch(() => {})
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !listName.trim()) { setError('Please enter a list name and select a file'); return }
    setLoading(true); setError(''); setResult(null)
    const formData = new FormData()
    formData.append('name', listName)
    formData.append('file', selectedFile)
    try {
      const r = await uploadFile(formData)
      setResult(r.data)
      setListName(''); setSelectedFile(null)
      fetchLists()
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally { setLoading(false) }
  }

  const handlePaste = async () => {
    if (!pasteText.trim() || !listName.trim()) { setError('Please enter a list name and phone numbers'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await pasteNumbers({ name: listName, text: pasteText })
      setResult(r.data)
      setListName(''); setPasteText('')
      fetchLists()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to process numbers')
    } finally { setLoading(false) }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this recipient list?')) return
    await deleteList(id)
    fetchLists()
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Upload Recipient Numbers</div>
        <div className="page-sub">Upload CSV/Excel, paste numbers, or connect a database</div>
      </div>

      <div className="two-col" style={{ gap: 16, alignItems: 'start' }}>
        {/* Left — upload form */}
        <div>
          <div className="card">
            <div className="form-row">
              <label className="label">List Name</label>
              <input className="input" placeholder="e.g. Summer Sale — US Customers"
                value={listName} onChange={e => setListName(e.target.value)} />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {['file', 'paste'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: 12, padding: '6px 14px' }}>
                  <i className={`ti ti-${t === 'file' ? 'upload' : 'clipboard-text'}`} />
                  {t === 'file' ? 'Upload File' : 'Paste Numbers'}
                </button>
              ))}
            </div>

            {tab === 'file' && (
              <>
                <div
                  className={`drop-zone`}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--green)' : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: 10, padding: 32, textAlign: 'center', cursor: 'pointer',
                    background: dragOver ? 'rgba(0,168,132,0.05)' : 'transparent',
                    transition: 'all 0.15s', marginBottom: 12,
                  }}
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <i className="ti ti-file-spreadsheet" style={{ fontSize: 36, color: selectedFile ? 'var(--green)' : 'var(--text-3)' }} />
                  <div style={{ marginTop: 10, color: selectedFile ? 'var(--text-1)' : 'var(--text-2)', fontSize: 13 }}>
                    {selectedFile ? `✓ ${selectedFile.name}` : 'Drop CSV or Excel file here, or click to browse'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    .csv, .xlsx, .xls supported · Auto-detects phone number column
                  </div>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                    onChange={e => setSelectedFile(e.target.files[0])} />
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={handleFileUpload} disabled={loading || !selectedFile || !listName}>
                  {loading ? <><i className="ti ti-loader-2" /> Processing...</> : <><i className="ti ti-upload" /> Upload & Validate</>}
                </button>
              </>
            )}

            {tab === 'paste' && (
              <>
                <div className="form-row">
                  <label className="label">Phone Numbers (one per line or comma separated)</label>
                  <textarea className="input" rows={10} placeholder={`+12125550001\n+13105550002\n+17185550003\n\nOr comma-separated:\n+12125550001, +13105550002`}
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    style={{ resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: 12 }} />
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    {pasteText.split(/[\n,;]+/).filter(s => s.trim()).length} numbers detected
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%' }}
                  onClick={handlePaste} disabled={loading || !pasteText || !listName}>
                  {loading ? <><i className="ti ti-loader-2" /> Processing...</> : <><i className="ti ti-check" /> Validate & Save</>}
                </button>
              </>
            )}

            {error && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(241,92,109,0.1)', borderRadius: 8, color: 'var(--red)', fontSize: 13 }}>
                <i className="ti ti-alert-circle" /> {error}
              </div>
            )}

            {result && (
              <div style={{ marginTop: 12, padding: '14px', background: 'rgba(0,168,132,0.08)', borderRadius: 10, border: '0.5px solid rgba(0,168,132,0.2)' }}>
                <div style={{ fontWeight: 500, color: 'var(--green)', marginBottom: 10 }}>
                  <i className="ti ti-circle-check" /> Upload complete
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    ['Total Raw', result.total_raw],
                    ['Valid', result.valid_count],
                    ['Invalid', result.invalid_count],
                    ['Duplicates', result.duplicate_count],
                  ].map(([label, val]) => (
                    <div key={label} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-2)' }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-1)' }}>{val?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                {result.invalid_samples?.length > 0 && (
                  <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-2)' }}>
                    Invalid samples: {result.invalid_samples.join(', ')}
                  </div>
                )}
                <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }}
                  onClick={() => navigate('/campaigns/new')}>
                  <i className="ti ti-speakerphone" /> Use in Campaign
                </button>
              </div>
            )}
          </div>

          {/* Format guide */}
          <div className="card">
            <div className="card-title">Accepted Formats</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8 }}>
              <div><i className="ti ti-check" style={{ color: 'var(--green)' }} /> US: +1 (212) 555-0001 or 12125550001</div>
              <div><i className="ti ti-check" style={{ color: 'var(--green)' }} /> International: +44 7700 900000</div>
              <div><i className="ti ti-check" style={{ color: 'var(--green)' }} /> CSV column headers auto-detected (phone, mobile, number, tel)</div>
              <div><i className="ti ti-check" style={{ color: 'var(--green)' }} /> Duplicates removed automatically</div>
              <div><i className="ti ti-x" style={{ color: 'var(--red)' }} /> Invalid/non-existent numbers flagged</div>
            </div>
          </div>
        </div>

        {/* Right — saved lists */}
        <div>
          <div className="card">
            <div className="card-title">Saved Recipient Lists</div>
            {lists.length === 0 ? (
              <div style={{ color: 'var(--text-2)', fontSize: 13, padding: '10px 0' }}>
                No lists yet. Upload numbers to get started.
              </div>
            ) : (
              lists.map(lst => (
                <div key={lst.id} style={{
                  padding: '12px 0', borderBottom: '0.5px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <i className="ti ti-users" style={{ fontSize: 20, color: 'var(--text-2)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{lst.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                      {(lst.valid_count || 0).toLocaleString()} valid ·
                      {lst.invalid_count > 0 ? ` ${lst.invalid_count} invalid ·` : ''} {' '}
                      <span className={`badge ${lst.status === 'ready' ? 'badge-green' : 'badge-amber'}`}>{lst.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => navigate('/campaigns/new', { state: { list_id: lst.id, list_name: lst.name } })}>
                      Use
                    </button>
                    <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }}
                      onClick={() => handleDelete(lst.id)}>
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
