import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, MINING_TABLE } from '../lib/supabase'
import {
  initialForm,
  parseOptionalNumber,
  findDuplicateToday,
  formatWhen,
} from '../lib/miningFormUtils'
import MiningFormFields from '../components/MiningFormFields'
import '../App.css'

export default function CreateEntry() {
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [status, setStatus] = useState({ type: null, message: '' })
  const [saving, setSaving] = useState(false)
  const [duplicateRow, setDuplicateRow] = useState(null)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    if (status.type) setStatus({ type: null, message: '' })
    if (duplicateRow) setDuplicateRow(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const mineid = form.mineid.trim()

    if (!mineid) {
      setStatus({ type: 'error', message: 'Please enter a mine ID.' })
      return
    }

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

    const { error: dupErr, existing } = await findDuplicateToday(mineid)
    if (dupErr) {
      setStatus({
        type: 'error',
        message: dupErr.message || 'Could not check for existing records.',
      })
      return
    }
    if (existing) {
      setDuplicateRow(existing)
      setStatus({
        type: 'error',
        message:
          'This mine already has an entry for today (same calendar day as `created_at`). Go to Update to change it, or use the actions below.',
      })
      return
    }

    const row = {
      created_at: new Date().toISOString(),
      ...metrics,
    }

    setSaving(true)
    const { error } = await supabase.from(MINING_TABLE).insert(row)
    setSaving(false)

    if (error) {
      setStatus({
        type: 'error',
        message:
          error.message ||
          'Could not save. Check columns in Supabase and Row Level Security.',
      })
      return
    }

    setForm(initialForm)
    setDuplicateRow(null)
    setStatus({ type: 'success', message: 'New record saved successfully.' })
  }

  function goUpdateWithRow(row) {
    navigate('/activity/update', { state: { editRow: row } })
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Create entry</h1>
        <p className="subtitle">
          New rows get the current timestamp. Each mine can have only one new entry per calendar day—use{' '}
          <Link to="/activity/update" className="inline-link">
            Update
          </Link>{' '}
          to change existing figures.
        </p>
      </header>

      {duplicateRow && (
        <div className="notice" role="alert">
          <p className="notice-title">Already entered today</p>
          <p>
            A row already exists for mine <strong>{duplicateRow.mineid}</strong> (`created_at`{' '}
            <strong>{formatWhen(duplicateRow.created_at)}</strong>).
          </p>
          <p className="notice-actions">
            <button type="button" className="btn" onClick={() => goUpdateWithRow(duplicateRow)}>
              Open in Update
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setDuplicateRow(null)
                setStatus({ type: null, message: '' })
              }}
            >
              Dismiss
            </button>
          </p>
        </div>
      )}

      <section className="section" aria-labelledby="create-form-heading">
        <h2 id="create-form-heading" className="section-title">
          New record
        </h2>
        <p className="section-hint">Fill in mine ID and usage figures, then save.</p>

        <form className="card" onSubmit={handleSubmit} noValidate>
          <MiningFormFields form={form} onChange={update} mineIdDisabled={false} />

          {status.type && (
            <p
              className={`feedback ${status.type === 'error' ? 'feedback--error' : 'feedback--ok'}`}
              role="status"
            >
              {status.message}
            </p>
          )}

          <div className="actions">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save new record'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
