import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  uploadFile,
  pasteNumbers,
  getLists,
  deleteList,
} from '../utils/api'

export default function Upload() {
  const navigate = useNavigate()
  const fileRef = useRef()

  const [tab, setTab] = useState('file')
  const [listName, setListName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [lists, setLists] = useState([])
  const [selectedFile, setSelectedFile] = useState(null)

  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async () => {
    try {
      const response = await getLists()
      setLists(response.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const resetState = () => {
    setError('')
    setResult(null)
  }

  const handleSelectFile = (file) => {
    if (!file) return

    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]

    const extensionAllowed =
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')

    if (!allowed.includes(file.type) && !extensionAllowed) {
      setError('Only CSV and Excel files are allowed')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const handleFileUpload = async () => {
    resetState()

    if (!listName.trim()) {
      setError('Please enter a list name')
      return
    }

    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    try {
      setLoading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('name', listName)
      formData.append('file', selectedFile)

      const response = await uploadFile(formData)

      setResult(response.data)
      setListName('')
      setSelectedFile(null)
      setUploadProgress(100)

      fetchLists()
    } catch (err) {
      console.error(err)
      setError(
        err.response?.data?.detail ||
          'Upload failed. Please check your file.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handlePaste = async () => {
    resetState()

    if (!listName.trim()) {
      setError('Please enter a list name')
      return
    }

    if (!pasteText.trim()) {
      setError('Please paste phone numbers')
      return
    }

    try {
      setLoading(true)

      const response = await pasteNumbers({
        name: listName,
        text: pasteText,
      })

      setResult(response.data)

      setListName('')
      setPasteText('')

      fetchLists()
    } catch (err) {
      console.error(err)

      setError(
        err.response?.data?.detail ||
          'Failed to process phone numbers'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)

    const file = e.dataTransfer.files[0]

    if (file) {
      handleSelectFile(file)
    }
  }

  const handleDelete = async (id) => {
    const confirmDelete = confirm(
      'Delete this recipient list permanently?'
    )

    if (!confirmDelete) return

    try {
      setDeletingId(id)

      await deleteList(id)

      fetchLists()
    } catch (err) {
      console.error(err)
      alert('Failed to delete list')
    } finally {
      setDeletingId(null)
    }
  }

  const detectedCount = pasteText
    .split(/[\n,;]+/)
    .filter((s) => s.trim()).length

  const filteredLists = lists.filter((list) =>
    list.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>

      <div className="page-header">
        <div className="page-title">
          Upload Recipient Numbers
        </div>

        <div className="page-sub">
          Upload CSV/Excel files or paste numbers directly
        </div>
      </div>

      <div
        className="two-col"
        style={{
          gap: 16,
          alignItems: 'start',
        }}
      >

        {/* LEFT SIDE */}

        <div>

          {/* MAIN UPLOAD CARD */}

          <div className="card">

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >

              <div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Create Recipient List
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-2)',
                  }}
                >
                  Numbers are validated automatically before sending
                </div>
              </div>

              <div
                className={`badge ${
                  tab === 'file'
                    ? 'badge-green'
                    : 'badge-amber'
                }`}
              >
                {tab === 'file'
                  ? 'File Upload'
                  : 'Paste Mode'}
              </div>

            </div>

            {/* LIST NAME */}

            <div className="form-row">
              <label className="label">
                Recipient List Name
              </label>

              <input
                className="input"
                placeholder="e.g. Black Friday Customers"
                value={listName}
                onChange={(e) =>
                  setListName(e.target.value)
                }
              />
            </div>

            {/* TABS */}

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 18,
              }}
            >

              <button
                onClick={() => setTab('file')}
                className={`btn ${
                  tab === 'file'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
                style={{
                  fontSize: 12,
                  padding: '7px 14px',
                }}
              >
                <i className="ti ti-upload" />
                Upload File
              </button>

              <button
                onClick={() => setTab('paste')}
                className={`btn ${
                  tab === 'paste'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
                style={{
                  fontSize: 12,
                  padding: '7px 14px',
                }}
              >
                <i className="ti ti-clipboard-text" />
                Paste Numbers
              </button>

            </div>

            {/* FILE TAB */}

            {tab === 'file' && (
              <>

                <div
                  style={{
                    border: `2px dashed ${
                      dragOver
                        ? 'var(--green)'
                        : 'rgba(255,255,255,0.12)'
                    }`,
                    borderRadius: 12,
                    padding: 36,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: dragOver
                      ? 'rgba(0,168,132,0.05)'
                      : 'transparent',
                  }}
                  onClick={() => fileRef.current.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() =>
                    setDragOver(false)
                  }
                  onDrop={handleDrop}
                >

                  <i
                    className="ti ti-file-spreadsheet"
                    style={{
                      fontSize: 42,
                      color: selectedFile
                        ? 'var(--green)'
                        : 'var(--text-3)',
                    }}
                  />

                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      color: selectedFile
                        ? 'var(--text-1)'
                        : 'var(--text-2)',
                      fontWeight: 500,
                    }}
                  >
                    {selectedFile
                      ? selectedFile.name
                      : 'Drop CSV or Excel file here'}
                  </div>

                  <div
                    style={{
                      marginTop: 5,
                      fontSize: 11,
                      color: 'var(--text-3)',
                    }}
                  >
                    .csv .xlsx .xls supported
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) =>
                      handleSelectFile(
                        e.target.files[0]
                      )
                    }
                  />

                </div>

                {selectedFile && (
                  <div
                    style={{
                      marginTop: 14,
                      background:
                        'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >

                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'center',
                      }}
                    >

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >

                        <i
                          className="ti ti-file"
                          style={{
                            fontSize: 20,
                            color: 'var(--green)',
                          }}
                        />

                        <div>

                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                            }}
                          >
                            {selectedFile.name}
                          </div>

                          <div
                            style={{
                              fontSize: 11,
                              color:
                                'var(--text-2)',
                            }}
                          >
                            {(
                              selectedFile.size /
                              1024
                            ).toFixed(1)}{' '}
                            KB
                          </div>

                        </div>

                      </div>

                      <button
                        className="btn btn-danger"
                        style={{
                          padding: '4px 8px',
                          fontSize: 11,
                        }}
                        onClick={() =>
                          setSelectedFile(null)
                        }
                      >
                        <i className="ti ti-x" />
                      </button>

                    </div>

                  </div>
                )}

                {loading && (
                  <div
                    style={{
                      marginTop: 14,
                    }}
                  >

                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        marginBottom: 6,
                        fontSize: 12,
                        color: 'var(--text-2)',
                      }}
                    >
                      <span>Processing file...</span>
                      <span>{uploadProgress}%</span>
                    </div>

                    <div className="progress">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${uploadProgress}%`,
                        }}
                      />
                    </div>

                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: 16,
                  }}
                  disabled={
                    loading ||
                    !selectedFile ||
                    !listName
                  }
                  onClick={handleFileUpload}
                >
                  {loading ? (
                    <>
                      <i className="ti ti-loader-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-upload" />
                      Upload & Validate
                    </>
                  )}
                </button>

              </>
            )}

            {/* PASTE TAB */}

            {tab === 'paste' && (
              <>

                <div className="form-row">

                  <label className="label">
                    Phone Numbers
                  </label>

                  <textarea
                    className="input"
                    rows={12}
                    placeholder={`+12125550001
+13105550002
+447700900000

or comma separated`}
                    value={pasteText}
                    onChange={(e) =>
                      setPasteText(
                        e.target.value
                      )
                    }
                    style={{
                      resize: 'vertical',
                      fontFamily:
                        'var(--font-mono)',
                      fontSize: 12,
                    }}
                  />

                  <div
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      fontSize: 11,
                      color: 'var(--text-3)',
                    }}
                  >

                    <span>
                      {detectedCount.toLocaleString()}{' '}
                      numbers detected
                    </span>

                    <span>
                      Auto duplicate removal enabled
                    </span>

                  </div>

                </div>

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                  }}
                  disabled={
                    loading ||
                    !pasteText ||
                    !listName
                  }
                  onClick={handlePaste}
                >
                  {loading ? (
                    <>
                      <i className="ti ti-loader-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="ti ti-check" />
                      Validate & Save
                    </>
                  )}
                </button>

              </>
            )}

            {/* ERROR */}

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background:
                    'rgba(241,92,109,0.08)',
                  color: 'var(--red)',
                  fontSize: 13,
                }}
              >
                <i className="ti ti-alert-circle" />{' '}
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {result && (
              <div
                style={{
                  marginTop: 16,
                  borderRadius: 12,
                  padding: 16,
                  background:
                    'rgba(0,168,132,0.08)',
                  border:
                    '0.5px solid rgba(0,168,132,0.18)',
                }}
              >

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: 'var(--green)',
                    fontWeight: 600,
                    marginBottom: 14,
                  }}
                >
                  <i className="ti ti-circle-check" />
                  Upload completed successfully
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 1fr',
                    gap: 10,
                  }}
                >

                  {[
                    [
                      'Total Raw',
                      result.total_raw,
                    ],
                    [
                      'Valid',
                      result.valid_count,
                    ],
                    [
                      'Invalid',
                      result.invalid_count,
                    ],
                    [
                      'Duplicates',
                      result.duplicate_count,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      style={{
                        background:
                          'rgba(0,0,0,0.18)',
                        borderRadius: 10,
                        padding: 12,
                      }}
                    >

                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-2)',
                          marginBottom: 5,
                        }}
                      >
                        {label}
                      </div>

                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 700,
                        }}
                      >
                        {value?.toLocaleString()}
                      </div>

                    </div>
                  ))}

                </div>

                {result.invalid_samples?.length >
                  0 && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 11,
                      color: 'var(--text-2)',
                    }}
                  >
                    Invalid samples:{' '}
                    {result.invalid_samples.join(
                      ', '
                    )}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    marginTop: 16,
                  }}
                  onClick={() =>
                    navigate('/campaigns/new')
                  }
                >
                  <i className="ti ti-speakerphone" />
                  Create Campaign
                </button>

              </div>
            )}

          </div>

          {/* GUIDE */}

          <div className="card">

            <div className="card-title">
              Accepted Formats
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                fontSize: 12,
                color: 'var(--text-2)',
              }}
            >

              <div>
                <i
                  className="ti ti-check"
                  style={{
                    color: 'var(--green)',
                  }}
                />{' '}
                CSV and Excel files supported
              </div>

              <div>
                <i
                  className="ti ti-check"
                  style={{
                    color: 'var(--green)',
                  }}
                />{' '}
                Auto-detect phone columns
              </div>

              <div>
                <i
                  className="ti ti-check"
                  style={{
                    color: 'var(--green)',
                  }}
                />{' '}
                International numbers supported
              </div>

              <div>
                <i
                  className="ti ti-check"
                  style={{
                    color: 'var(--green)',
                  }}
                />{' '}
                Duplicates removed automatically
              </div>

              <div>
                <i
                  className="ti ti-check"
                  style={{
                    color: 'var(--green)',
                  }}
                />{' '}
                Invalid numbers flagged before send
              </div>

            </div>

          </div>

        </div>

        {/* RIGHT SIDE */}

        <div>

          <div className="card">

            <div
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >

              <div className="card-title">
                Saved Recipient Lists
              </div>

              <div
                className="badge badge-gray"
              >
                {lists.length} Lists
              </div>

            </div>

            <div
              className="form-row"
              style={{
                marginBottom: 14,
              }}
            >

              <input
                className="input"
                placeholder="Search lists..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>

            {filteredLists.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 10px',
                  color: 'var(--text-2)',
                }}
              >

                <i
                  className="ti ti-users"
                  style={{
                    fontSize: 34,
                    marginBottom: 10,
                    display: 'block',
                  }}
                />

                No recipient lists found

              </div>
            ) : (
              filteredLists.map((list) => (
                <div
                  key={list.id}
                  style={{
                    padding: '14px 0',
                    borderBottom:
                      '0.5px solid var(--border)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >

                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background:
                        'rgba(255,255,255,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >

                    <i
                      className="ti ti-users"
                      style={{
                        fontSize: 20,
                        color: 'var(--green)',
                      }}
                    />

                  </div>

                  <div style={{ flex: 1 }}>

                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        marginBottom: 3,
                      }}
                    >
                      {list.name}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-2)',
                      }}
                    >
                      {(list.valid_count || 0).toLocaleString()}{' '}
                      valid contacts
                    </div>

                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                    }}
                  >

                    <button
                      className="btn btn-secondary"
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                      }}
                      onClick={() =>
                        navigate(
                          '/campaigns/new',
                          {
                            state: {
                              list_id:
                                list.id,
                              list_name:
                                list.name,
                            },
                          }
                        )
                      }
                    >
                      Use
                    </button>

                    <button
                      className="btn btn-danger"
                      style={{
                        padding: '5px 10px',
                        fontSize: 11,
                      }}
                      disabled={
                        deletingId === list.id
                      }
                      onClick={() =>
                        handleDelete(list.id)
                      }
                    >
                      {deletingId ===
                      list.id ? (
                        '...'
                      ) : (
                        <i className="ti ti-trash" />
                      )}
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