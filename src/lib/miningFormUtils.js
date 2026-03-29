import { supabase, MINING_TABLE } from './supabase'

export const initialForm = {
  mineid: '',
  diesel: '',
  petrol: '',
  electricity: '',
  explosives: '',
  methane: '',
}

export const SELECT_FIELDS =
  'id, created_at, mineid, diesel, petrol, electricity, explosives, methane'

export function parseOptionalNumber(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function numToInput(n) {
  if (n == null || n === '') return ''
  return String(n)
}

export function rowToForm(row) {
  return {
    mineid: String(row.mineid ?? ''),
    diesel: numToInput(row.diesel),
    petrol: numToInput(row.petrol),
    electricity: numToInput(row.electricity),
    explosives: numToInput(row.explosives),
    methane: numToInput(row.methane),
  }
}

export function getLocalDayBounds(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

export function formatWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return String(iso)
  }
}

export function listErrorMessage(error) {
  if (!error?.message) return 'Could not load records.'
  if (error.message.includes('column')) {
    return 'Check that your `mining` table columns match the app (mineid, diesel, …) and that a primary key `id` exists for updates, then refresh.'
  }
  return error.message
}

export async function fetchMiningRecords() {
  const { data, error } = await supabase
    .from(MINING_TABLE)
    .select(SELECT_FIELDS)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return { records: [], error }
  return { records: data ?? [], error: null }
}

export async function findDuplicateToday(mineid) {
  const { startIso, endIso } = getLocalDayBounds()
  const { data, error } = await supabase
    .from(MINING_TABLE)
    .select(SELECT_FIELDS)
    .eq('mineid', mineid)
    .gte('created_at', startIso)
    .lt('created_at', endIso)
    .limit(1)

  if (error) return { error, existing: null }
  return { error: null, existing: data?.[0] ?? null }
}
