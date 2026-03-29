import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts'
import { useMineProfile } from '../context/MineProfileContext'
import { useMiningRecords } from '../hooks/useMiningRecords'
import {
  aggregateEmissions,
  annualEstimateFromRecords,
  perCapitaAnnual,
  resolveGridFactorFromProfile,
} from '../lib/carbonCalculations'
import '../App.css'
import './pages-theme.css'

const COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2']

export default function EmissionsAnalysis() {
  const { profile } = useMineProfile()
  const filterId = profile.mineId || ''
  const { records, loading, error, reload } = useMiningRecords(filterId || null)

  const mineType = profile.mineType || 'opencast'
  const gridF = resolveGridFactorFromProfile(profile)

  const agg = useMemo(
    () => aggregateEmissions(records, mineType, gridF),
    [records, mineType, gridF],
  )
  const { sum, breakdowns } = agg

  const annualPack = useMemo(
    () => annualEstimateFromRecords(records, mineType, gridF),
    [records, mineType, gridF],
  )

  const pc = perCapitaAnnual(annualPack.annual, profile.headcount)

  const barData = useMemo(
    () => [
      { name: 'Diesel', t: sum.diesel },
      { name: 'Petrol', t: sum.petrol },
      { name: 'Electricity', t: sum.electricity },
      { name: 'Explosives', t: sum.explosives },
      { name: 'Methane', t: sum.methane },
    ],
    [sum],
  )

  return (
    <div className="page page--wide">
      <header className="header">
        <h1>Activity-wise emission quantification</h1>
        <p className="subtitle">
          Converts logged mining activity into tCO₂e using illustrative factors (fuels, Indian grid
          intensity, blasting, and GWP₁₀₀ methane), scaled by your mine type profile.
        </p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => reload()}>
          Refresh data
        </button>
      </header>

      {error && <p className="feedback feedback--error">{error}</p>}
      {loading && <p className="muted">Loading activity records…</p>}

      {!loading && !error && records.length === 0 && (
        <p className="muted">
          No records found{filterId ? ` for mine “${filterId}”` : ''}. Add data under Create or adjust
          Mine ID in Settings.
        </p>
      )}

      {!loading && records.length > 0 && (
        <>
          <div className="kpi-grid">
            <article className="kpi-card">
              <h3 className="kpi-card__label">Sum (reporting period)</h3>
              <p className="kpi-card__value">
                {sum.total.toFixed(2)} <span className="kpi-card__unit">t CO₂e</span>
              </p>
            </article>
            <article className="kpi-card kpi-card--accent">
              <h3 className="kpi-card__label">Illustrative annual</h3>
              <p className="kpi-card__value">
                {annualPack.annual.toFixed(1)} <span className="kpi-card__unit">t/yr</span>
              </p>
              <p className="kpi-card__hint">{annualPack.recordCount} row(s) averaged × 365</p>
            </article>
            <article className="kpi-card">
              <h3 className="kpi-card__label">Per-capita (annual est.)</h3>
              <p className="kpi-card__value">
                {pc == null ? '—' : pc.toFixed(3)}{' '}
                <span className="kpi-card__unit">t / person</span>
              </p>
            </article>
          </div>

          <div className="panel">
            <h2 className="panel__title">Emissions by activity (aggregated tCO₂e)</h2>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--tooltip-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="t" name="t CO₂e" radius={[6, 6, 0, 0]}>
                    {barData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel__title">Record-level detail</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Mine</th>
                    <th className="num">tCO₂e</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdowns.map((b, i) => (
                    <tr key={records[i]?.id ?? i}>
                      <td>
                        {records[i]?.created_at
                          ? new Date(records[i].created_at).toLocaleString()
                          : '—'}
                      </td>
                      <td>{records[i]?.mineid}</td>
                      <td className="num">{b.total.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
