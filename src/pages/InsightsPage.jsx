import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useMineProfile } from '../context/MineProfileContext'
import { useMiningRecords } from '../hooks/useMiningRecords'
import {
  emissionBreakdownFromRow,
  annualEstimateFromRecords,
  aggregateEmissions,
  resolveGridFactorFromProfile,
} from '../lib/carbonCalculations'
import '../App.css'
import './pages-theme.css'

const PIE_COLORS = ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '#95d5b2']

export default function InsightsPage() {
  const { profile } = useMineProfile()
  const filterId = profile.mineId || ''
  const { records, loading, error, reload } = useMiningRecords(filterId || null)
  const mineType = profile.mineType || 'opencast'
  const gridF = resolveGridFactorFromProfile(profile)

  const trendData = useMemo(() => {
    const byDay = new Map()
    for (const r of records) {
      const day = r.created_at ? String(r.created_at).slice(0, 10) : 'unknown'
      const b = emissionBreakdownFromRow(r, { mineType, gridFactorPerMwh: gridF })
      byDay.set(day, (byDay.get(day) || 0) + b.total)
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, t]) => ({ date, tCO2: Number(t.toFixed(3)) }))
  }, [records, mineType, gridF])

  const pieData = useMemo(() => {
    const { sum } = aggregateEmissions(records, mineType, gridF)
    if (sum.total <= 0) return []
    return [
      { name: 'Diesel', value: sum.diesel },
      { name: 'Petrol', value: sum.petrol },
      { name: 'Electricity', value: sum.electricity },
      { name: 'Explosives', value: sum.explosives },
      { name: 'Methane', value: sum.methane },
    ].filter((d) => d.value > 0)
  }, [records, mineType, gridF])

  const annualPack = annualEstimateFromRecords(records, mineType, gridF)

  return (
    <div className="page page--wide">
      <header className="header">
        <h1>Visualization & trends</h1>
        <p className="subtitle">
          Track daily-pattern totals from your Supabase activity log and the composition of emissions—
          supporting transparency and monitoring of strategy effectiveness over time.
        </p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => reload()}>
          Refresh data
        </button>
      </header>

      {error && <p className="feedback feedback--error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && records.length === 0 && (
        <p className="muted">No data to chart yet — capture activity on the Create page.</p>
      )}

      {!loading && records.length > 0 && (
        <>
          <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
            <article className="kpi-card">
              <h3 className="kpi-card__label">Unique reporting days</h3>
              <p className="kpi-card__value">{trendData.length}</p>
            </article>
            <article className="kpi-card kpi-card--accent">
              <h3 className="kpi-card__label">Illustr. annual (from avg day)</h3>
              <p className="kpi-card__value">{annualPack.annual.toFixed(1)} t/yr</p>
            </article>
          </div>

          <div className="path-grid">
            <div className="panel">
              <h2 className="panel__title">Emissions by reporting date (sum tCO₂e)</h2>
              {trendData.length < 2 ? (
                <p className="muted">Add more dated records to see a trend line.</p>
              ) : (
                <div className="chart-wrap" style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--tooltip-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="tCO2"
                        name="t CO₂e"
                        stroke="#2d6a4f"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#40916c' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="panel">
              <h2 className="panel__title">Share of emissions (aggregated)</h2>
              <div className="chart-wrap" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={88}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--tooltip-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
