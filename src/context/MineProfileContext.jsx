import { createContext, useContext, useMemo, useState, useEffect } from 'react'

const STORAGE_KEY = 'coal-mine-carbon-profile-v1'

const defaultProfile = {
  mineName: '',
  mineId: '',
  mineType: 'opencast',
  headcount: 200,
  state: 'JH',
  gridFactorOverride: '',
  /** Optional: illustrative carbon credit market reference (INR / tCO₂e) */
  carbonCreditInrPerTonne: 850,
}

const MineProfileContext = createContext(null)

export function MineProfileProvider({ children }) {
  const [profile, setProfile] = useState(defaultProfile)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setProfile({ ...defaultProfile, ...JSON.parse(raw) })
      }
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {
      /* ignore */
    }
  }, [profile, hydrated])

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      updateProfile(partial) {
        setProfile((prev) => ({ ...prev, ...partial }))
      },
      hydrated,
    }),
    [profile, hydrated],
  )

  return <MineProfileContext.Provider value={value}>{children}</MineProfileContext.Provider>
}

export function useMineProfile() {
  const ctx = useContext(MineProfileContext)
  if (!ctx) throw new Error('useMineProfile must be used within MineProfileProvider')
  return ctx
}
