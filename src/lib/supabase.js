import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and set them.',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '')

export const MINING_TABLE    = import.meta.env.VITE_SUPABASE_TABLE ?? 'mining'
export const MINE_AUTH_TABLE = 'mineauth'
