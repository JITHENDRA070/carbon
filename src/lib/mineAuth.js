export function normalizeMineId(input) {
  return String(input ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
}

// Supabase Auth needs an email for password auth. We map mine IDs to a synthetic email.
// This keeps the UX "Mine ID + PIN" while using standard auth.
export function mineIdToEmail(mineId) {
  const id = normalizeMineId(mineId)
  return `${id.toLowerCase()}@mine.local`
}

export function getMineIdFromSession(session) {
  return (
    session?.user?.user_metadata?.mineid ??
    session?.user?.app_metadata?.mineid ??
    null
  )
}

