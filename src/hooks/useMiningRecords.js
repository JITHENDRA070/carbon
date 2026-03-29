import { useState, useCallback, useEffect } from 'react'
import { listErrorMessage, fetchMiningRecords } from '../lib/miningFormUtils'

export function useMiningRecords(filterMineId) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setLoading(false)
      setRecords([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const { records: data, error: err } = await fetchMiningRecords()
    setLoading(false)
    if (err) {
      setError(listErrorMessage(err))
      setRecords([])
      return
    }
    let rows = data ?? []
    const mid = (filterMineId ?? '').trim().toLowerCase()
    if (mid) {
      rows = rows.filter((r) => String(r.mineid ?? '').toLowerCase() === mid)
    }
    setRecords(rows)
  }, [filterMineId])

  useEffect(() => {
    load()
  }, [load])

  return { records, loading, error, reload: load }
}
