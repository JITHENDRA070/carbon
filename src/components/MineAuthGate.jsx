import React, { useEffect, useMemo, useState } from 'react'
import { supabase, MINE_AUTH_TABLE } from '../lib/supabase'
import { getMineIdFromSession, mineIdToEmail, normalizeMineId } from '../lib/mineAuth'
import { MineAuthContext } from '../context/MineAuthContext'

export default function MineAuthGate({ children }) {
  const [session, setSession]   = useState(null)
  const [loading, setLoading]   = useState(true)

  const [mineId,   setMineId]   = useState('')
  const [password, setPassword] = useState('')
  const [mode,     setMode]     = useState('login') // 'login' | 'register'
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [busy,     setBusy]     = useState(false)

  /* ── Session bootstrap ──────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return
        setSession(data.session ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setSession(null)
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  /* Restore synthetic session stored in localStorage after page reload */
  useEffect(() => {
    if (!loading && !session) {
      const stored = localStorage.getItem('mineauth_mineid')
      if (stored) {
        setSession({ user: { user_metadata: { mineid: stored } } })
      }
    }
  }, [loading])

  const authedMineId = useMemo(
    () => normalizeMineId(getMineIdFromSession(session)),
    [session],
  )

  /* ── Helpers ────────────────────────────────────────────────────── */
  function clearMessages() { setError(''); setInfo('') }

  /* ── Sign Out ───────────────────────────────────────────────────── */
  async function signOut() {
    localStorage.removeItem('mineauth_mineid')
    await supabase.auth.signOut()
    setSession(null)
  }

  /* ── Registration ───────────────────────────────────────────────── */
  async function doRegister(e) {
    e.preventDefault()
    clearMessages()
    setBusy(true)

    const id = normalizeMineId(mineId)
    if (!id)       { setError('Mine ID is required.'); setBusy(false); return }
    if (!password) { setError('Password is required.'); setBusy(false); return }

    try {
      const { data: existing, error: lookupErr } = await supabase
        .from(MINE_AUTH_TABLE)
        .select('mineid')
        .eq('mineid', id)
        .maybeSingle()

      if (lookupErr) throw lookupErr
      if (existing) {
        setError(`Mine ID "${id}" is already registered. Please sign in.`)
        setBusy(false)
        return
      }

      const { error: insertErr } = await supabase
        .from(MINE_AUTH_TABLE)
        .insert({ mineid: id, minepassword: password })

      if (insertErr) throw insertErr

      const { error: authErr } = await supabase.auth.signUp({
        email: mineIdToEmail(id),
        password,
        options: { data: { mineid: id } },
      })

      if (authErr && !authErr.message?.toLowerCase().includes('already registered')) {
        throw authErr
      }

      setInfo(`✅ Mine ID "${id}" registered! You can now sign in.`)
      setMode('login')
      setMineId(id)
      setPassword('')
    } catch (err) {
      console.error('[mineauth] register error:', err)
      setError(err.message || 'Registration failed.')
    } finally {
      setBusy(false)
    }
  }

  /* ── Login ──────────────────────────────────────────────────────── */
  async function doLogin(e) {
    e.preventDefault()
    clearMessages()
    setBusy(true)

    const id = normalizeMineId(mineId)
    if (!id)       { setError('Mine ID is required.'); setBusy(false); return }
    if (!password) { setError('Password is required.'); setBusy(false); return }

    try {
      const { data: record, error: lookupErr } = await supabase
        .from(MINE_AUTH_TABLE)
        .select('mineid, minepassword')
        .eq('mineid', id)
        .eq('minepassword', password)
        .maybeSingle()

      if (lookupErr) throw lookupErr

      if (!record) {
        setError('Invalid Mine ID or password.')
        setBusy(false)
        return
      }

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: mineIdToEmail(id),
        password,
      })

      if (authErr) {
        console.warn('[mineauth] Supabase Auth sign-in issue:', authErr.message)
        localStorage.setItem('mineauth_mineid', id)
        setSession({ user: { user_metadata: { mineid: id } } })
      }
    } catch (err) {
      console.error('[mineauth] login error:', err)
      setError(err.message || 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  /* ── Context value ──────────────────────────────────────────────── */
  const authCtxValue = useMemo(
    () => ({ session, mineId: authedMineId, signOut }),
    [session, authedMineId],
  )

  /* ── Render: loading ────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="kpi-card" style={{ maxWidth: 520, margin: '4rem auto' }}>
            <div className="kpi-title">Loading session…</div>
            <div className="kpi-trend">Checking authentication.</div>
          </div>
        </main>
      </div>
    )
  }

  /* ── Render: auth form (not signed in) ──────────────────────────── */
  if (!session) {
    return (
      /* Provide context even on auth page so Navbar can read it */
      <MineAuthContext.Provider value={authCtxValue}>
        <div className="dashboard-container">
          <main className="main-content">
            <div
              className="kpi-card"
              style={{
                maxWidth: 520,
                margin: '4rem auto',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '2rem',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2rem' }}>⛏️</span>
                <div>
                  <div className="kpi-title" style={{ fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    IndianCoal™ Zero
                  </div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                    {mode === 'login' ? 'Mine Sign In' : 'Register Mine ID'}
                  </h2>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: '1.5rem' }}>
                {mode === 'login'
                  ? 'Enter your Mine ID and password to access your dashboard.'
                  : 'Create a Mine ID and password to start tracking carbon emissions.'}
              </p>

              {info && (
                <div style={{
                  padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.15)',
                  border: '1px solid #10b981', borderRadius: '8px',
                  color: '#10b981', fontWeight: 600, marginBottom: '1rem',
                }}>
                  {info}
                </div>
              )}

              <form onSubmit={mode === 'login' ? doLogin : doRegister}>
                <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="form-group">
                    <label htmlFor="auth-mineid">Mine ID</label>
                    <input
                      id="auth-mineid"
                      type="text"
                      value={mineId}
                      onChange={(e) => { setMineId(e.target.value); clearMessages() }}
                      placeholder="e.g. IND-COAL-01"
                      autoComplete="username"
                      disabled={busy}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="auth-password">Password</label>
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearMessages() }}
                      placeholder="Password"
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      disabled={busy}
                    />
                  </div>
                </div>

                {error && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.75rem 1rem',
                    background: 'rgba(239,68,68,0.12)', border: '1px solid #ef4444',
                    borderRadius: '8px', color: '#ef4444', fontWeight: 600,
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button className="btn-primary" type="submit" disabled={busy}
                    style={{ opacity: busy ? 0.7 : 1, flex: 1 }}>
                    {busy
                      ? (mode === 'login' ? '⏳ Signing in…' : '⏳ Registering…')
                      : (mode === 'login' ? '🔑 Sign In' : '🆕 Register')}
                  </button>
                  <button className="btn-outline" type="button" disabled={busy}
                    onClick={() => { setMode((m) => (m === 'login' ? 'register' : 'login')); clearMessages() }}>
                    {mode === 'login' ? 'Register' : '← Sign In'}
                  </button>
                </div>
              </form>

              <div className="kpi-trend" style={{ marginTop: '1.5rem', fontSize: '0.8rem' }}>
                {mode === 'login'
                  ? "Don't have an account? Click Register above."
                  : 'Already registered? Click ← Sign In above.'}
              </div>
            </div>
          </main>
        </div>
      </MineAuthContext.Provider>
    )
  }

  /* ── Render: authenticated ──────────────────────────────────────── */
  return (
    <MineAuthContext.Provider value={authCtxValue}>
      {children({ session, mineId: authedMineId })}
    </MineAuthContext.Provider>
  )
}
