import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts'
import { useMineProfile } from '../context/MineProfileContext'
import { useMiningRecords } from '../hooks/useMiningRecords'
import {
  aggregateEmissions,
  annualEstimateFromRecords,
  applyPathways,
  afforestationLandHa,
  carbonCreditValueInr,
  resolveGridFactorFromProfile,
  sourceSharesFromSum,
} from '../lib/carbonCalculations'
import { getSequestrationRate } from '../lib/emissionFactors'
import '../App.css'
import './pages-theme.css'

export default function PathwaysSimulator() {
  const { profile } = useMineProfile()
  const filterId = profile.mineId || ''
  const { records, loading, error, reload } = useMiningRecords(filterId || null)

  const mineType = profile.mineType || 'opencast'
  const gridF = resolveGridFactorFromProfile(profile)

  const [evPct, setEvPct] = useState(25)
  const [methaneCap, setMethaneCap] = useState(40)
  const [greenElec, setGreenElec] = useState(30)
  const [otherRenew, setOtherEnergy] = useState(15)
  const [cleanerBlast, setCleanerBlast] = useState(10)
  const [plannedHa, setPlannedHa] = useState(0)

  const baselineAnnual = useMemo(() => {
    if (records.length === 0) return 0
    return annualEstimateFromRecords(records, mineType, gridF).annual
  }, [records, mineType, gridF])

  const { sum, shares } = useMemo(() => {
    const agg = aggregateEmissions(records, mineType, gridF)
    const s = sourceSharesFromSum(agg.sum.total, agg.sum)
    return { sum: agg.sum, shares: s }
  }, [records, mineType, gridF])

  const pathwayResult = useMemo(() => {
    if (baselineAnnual <= 0) return null
    return applyPathways(baselineAnnual, shares, {
      evDieselReductionPct: evPct,
      methaneCapturePct: methaneCap,
      greenElectricityPct: greenElec,
      otherRenewablesPct: otherRenew,
      cleanerBlastingPct: cleanerBlast,
    })
  }, [baselineAnnual, shares, evPct, methaneCap, greenElec, otherRenew, cleanerBlast])

  const seqRate = getSequestrationRate(profile.state)
  const sinkTco2 = Math.max(0, plannedHa) * seqRate
  const residualAfterPath = pathwayResult?.projected ?? baselineAnnual
  const netAfterForest = Math.max(0, residualAfterPath - sinkTco2)
  const landToOffsetAll =
    residualAfterPath > 0 ? afforestationLandHa(residualAfterPath, profile.state) : 0
  const creditResidual = carbonCreditValueInr(netAfterForest, profile.carbonCreditInrPerTonne)
  const creditFull = carbonCreditValueInr(residualAfterPath, profile.carbonCreditInrPerTonne)

  const compareData = pathwayResult
    ? [
        { name: 'Baseline (est. yr)', t: Number(baselineAnnual.toFixed(2)) },
        { name: 'After levers', t: Number(pathwayResult.projected.toFixed(2)) },
        { name: 'After forest plan', t: Number(netAfterForest.toFixed(2)) },
      ]
    : []

  return (
    <div className="page page--wide">
      <header className="header">
        <h1>Carbon neutrality pathways</h1>
        <p className="subtitle">
          Simulate clean technologies, methane capture, renewable electricity, harder blasting
          footprints, afforestation sinks, and an indicative carbon-credit benchmark—against your
          illustrated annual emissions trajectory.
        </p>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => reload()}>
          Refresh data
        </button>
      </header>

      {error && <p className="feedback feedback--error">{error}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && records.length === 0 && (
        <p className="muted">Add activity records first, then return here to simulate reductions.</p>
      )}

      {!loading && records.length > 0 && (
        <div className="path-grid">
          <div className="panel">
            <h2 className="panel__title">Strategy levers</h2>

            <div className="range-field">
              <label>
                <span>EV / zero-tailpipe fleet & diesel displacement</span>
                <span>{evPct}%</span>
              </label>
              <input type="range" min={0} max={90} value={evPct} onChange={(e) => setEvPct(+e.target.value)} />
              <p className="range-hint">Share of modelled diesel-related emissions displaced.</p>
            </div>

            <div className="range-field">
              <label>
                <span>Methane capture / utilization</span>
                <span>{methaneCap}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={95}
                value={methaneCap}
                onChange={(e) => setMethaneCap(+e.target.value)}
              />
            </div>

            <div className="range-field">
              <label>
                <span>Renewable / green PPAs (grid factor)</span>
                <span>{greenElec}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={greenElec}
                onChange={(e) => setGreenElec(+e.target.value)}
              />
            </div>

            <div className="range-field">
              <label>
                <span>Other renewables (waste heat, solar process, etc.)</span>
                <span>{otherRenew}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={60}
                value={otherRenew}
                onChange={(e) => setOtherEnergy(+e.target.value)}
              />
            </div>

            <div className="range-field">
              <label>
                <span>Cleaner blasting / emulsion systems (explosives footprint)</span>
                <span>{cleanerBlast}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={40}
                value={cleanerBlast}
                onChange={(e) => setCleanerBlast(+e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="plannedHa">Planned afforestation (ha) — {profile.state} sink</label>
              <input
                id="plannedHa"
                type="number"
                min={0}
                step={1}
                value={plannedHa}
                onChange={(e) => setPlannedHa(Number(e.target.value) || 0)}
              />
              <p className="range-hint">
                Illustrative uptake ~{seqRate} tCO₂/ha·yr → sink{' '}
                <strong>{sinkTco2.toFixed(1)}</strong> tCO₂/yr.
              </p>
            </div>
          </div>

          <div className="panel">
            <h2 className="panel__title">Gap analysis & credits</h2>
            {pathwayResult && (
              <>
                <ul className="stat-list">
                  <li>
                    <span>Baseline (illustr. annual)</span>
                    <strong>{baselineAnnual.toFixed(1)} tCO₂e/yr</strong>
                  </li>
                  <li>
                    <span>After technology levers</span>
                    <strong>{pathwayResult.projected.toFixed(1)} tCO₂e/yr</strong>
                  </li>
                  <li>
                    <span>Emissions reduced</span>
                    <strong className="stat-list__good">−{pathwayResult.reduced.toFixed(1)} tCO₂e/yr</strong>
                  </li>
                  <li>
                    <span>Residual after planned forest</span>
                    <strong>{netAfterForest.toFixed(1)} tCO₂e/yr</strong>
                  </li>
                  <li>
                    <span>Land to offset full residual (no other sinks)</span>
                    <strong>{landToOffsetAll.toFixed(1)} ha</strong>
                  </li>
                  <li>
                    <span>Indicative credit value (residual @ ₹{profile.carbonCreditInrPerTonne}/t)</span>
                    <strong>₹{Math.round(creditResidual).toLocaleString('en-IN')}</strong>
                  </li>
                  <li>
                    <span>Indicative credit (before afforestation, full residual levers)</span>
                    <strong>₹{Math.round(creditFull).toLocaleString('en-IN')}</strong>
                  </li>
                </ul>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--tooltip-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="t" name="t CO₂e/yr" fill="#2d6a4f" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
