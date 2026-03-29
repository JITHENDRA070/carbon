import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase, MINING_TABLE } from '../lib/supabase'
import {
  initialForm,
  parseOptionalNumber,
  rowToForm,
  formatWhen,
  fetchMiningRecords,
  listErrorMessage,
} from '../lib/miningFormUtils'
import MiningFormFields from '../components/MiningFormFields'
import '../App.css'

export default function UpdateEntry() {
  const location = useLocation()
  const navigate = useNavigate()
  const lastImportedId = useRef(null)

  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: null, message: '' })
  const [saving, setSaving] = useState(false)
  const [records, setRecords] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingCreatedAt, setEditingCreatedAt] = useState(null)

  const loadRecords = useCallback(async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setListLoading(false)
      return
    }
    setListLoading(true)
    setListError(null)
    const { records: data, error } = await fetchMiningRecords()
    setListLoading(false)
    if (error) {
      setListError(listErrorMessage(error))
      setRecords([])
      return
    }
    setRecords(data)
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    const row = location.state?.editRow
    if (!row?.id) return
    if (lastImportedId.current === row.id) return
    lastImportedId.current = row.id

    setForm(rowToForm(row))
    setEditingId(row.id)
    setEditingCreatedAt(row.created_at)
    setStatus({
      type: 'success',
      message:
        'Record loaded. Adjust the figures below and save. The original `created_at` time will stay the same.',
    })
    navigate('/activity/update', { replace: true, state: {} })
  }, [location.state, navigate])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (status.type) setStatus({ type: null, message: '' })
  }

  function cancelEdit() {
    setForm(initialForm)
    setEditingId(null)
    setEditingCreatedAt(null)
    lastImportedId.current = null
    setStatus({ type: null, message: '' })
  }

  function beginEdit(row) {
    setForm(rowToForm(row))
    setEditingId(row.id)
    setEditingCreatedAt(row.created_at)
    setStatus({ type: null, message: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!editingId) {
      setStatus({ type: 'error', message: 'Select a record from the list and click Edit, or open one from Create.' })
      return
    }

    const mineid = form.mineid.trim()

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setStatus({
        type: 'error',
        message:
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
      })
      return
    }

    const metrics = {
      mineid,
      diesel: parseOptionalNumber(form.diesel),
      petrol: parseOptionalNumber(form.petrol),
      electricity: parseOptionalNumber(form.electricity),
      explosives: parseOptionalNumber(form.explosives),
      methane: parseOptionalNumber(form.methane),
    }

    setSaving(true)
    const { error } = await supabase.from(MINING_TABLE).update(metrics).eq('id', editingId)
    setSaving(false)

    if (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Could not update the record.',
      })
      return
    }

    setForm(initialForm)
    setEditingId(null)
    setEditingCreatedAt(null)
    lastImportedId.current = null
    setStatus({
      type: 'success',
      message: 'Record updated. The original `created_at` timestamp was not changed.',
    })
    loadRecords()
  }

  const isEditing = Boolean(editingId)

  return (
    <div className="page">
      <header className="header">
        <h1>Update records</h1>
        <p className="subtitle">
          Browse saved rows and edit usage figures. Mine ID stays fixed while editing; `created_at` is never
          changed on save.
        </p>
      </header>

      <section className="section" aria-labelledby="saved-heading">
        <h2 id="saved-heading" className="section-title">
          Saved records
        </h2>
        <p className="section-hint">Newest first. Click Edit to load a row into the form below.</p>

        {listLoading && <p className="muted">Loading…</p>}
        {listError && <p className="feedback feedback--error">{listError}</p>}

        {!listLoading && !listError && records.length === 0 && (
          <p className="muted">No records yet. Create one first.</p>
        )}

        {!listLoading && !listError && records.length > 0 && (
          <ul className="record-list">
            {records.map((row) => (
              <li key={row.id ?? `${row.created_at}-${row.mineid}`} className="record-item">
                <div className="record-meta">
                  <span className="record-when">{formatWhen(row.created_at)}</span>
                  <span className="record-tags">
                    Mine: <strong>{row.mineid}</strong>
                  </span>
                </div>
                <div className="record-metrics">
                  D {row.diesel ?? '—'} · P {row.petrol ?? '—'} · E {row.electricity ?? '—'} · X{' '}
                  {row.explosives ?? '—'} · M {row.methane ?? '—'}
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--secondary"
                  onClick={() => beginEdit(row)}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section" aria-labelledby="update-form-heading">
        <h2 id="update-form-heading" className="section-title">
          {isEditing ? 'Edit record' : 'Form'}
        </h2>
        {!isEditing && (
          <p className="section-hint">Choose a row above (or open one from Create) to enable updating.</p>
        )}
        {isEditing && editingCreatedAt && (
          <p className="edit-banner">
            Row created at <strong>{formatWhen(editingCreatedAt)}</strong>. Mine ID is locked.
          </p>
        )}

        <form className="card" onSubmit={handleSubmit} noValidate>
          <MiningFormFields form={form} onChange={update} mineIdDisabled={isEditing} />

          {status.type && (
            <p
              className={`feedback ${status.type === 'error' ? 'feedback--error' : 'feedback--ok'}`}
              role="status"
            >
              {status.message}
            </p>
          )}

          <div className="actions actions--split">
            {isEditing && (
              <button type="button" className="btn btn--secondary" disabled={saving} onClick={cancelEdit}>
                Cancel edit
              </button>
            )}
            <button type="submit" className="btn" disabled={saving || !isEditing}>
              {saving ? 'Saving…' : 'Update record'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
