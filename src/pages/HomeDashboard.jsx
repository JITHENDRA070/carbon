import { Link } from 'react-router-dom'
import { useMineProfile } from '../context/MineProfileContext'
import { useMiningRecords } from '../hooks/useMiningRecords'
import {
  annualEstimateFromRecords,
  perCapitaAnnual,
  resolveGridFactorFromProfile,
} from '../lib/carbonCalculations'
import '../App.css'
import './pages-theme.css'

export default function HomeDashboard() {
  const { profile } = useMineProfile()
  const filterId = profile.mineId || ''
  const { records, loading, error } = useMiningRecords(filterId || null)

  const mineType = profile.mineType || 'opencast'
  const gridF = resolveGridFactorFromProfile(profile)
  const annualPack = annualEstimateFromRecords(records, mineType, gridF)
  const pc = perCapitaAnnual(annualPack.annual, profile.headcount)

  return (
    <div className="page page--wide">
      <section className="hero-panel">
        <p className="hero-kicker">Indian coal sector · carbon intelligence</p>
        <h1 className="hero-title">Quantify emissions. Model neutrality pathways.</h1>
        <p className="hero-lead">
          Align mining activity data with illustrative emission factors, explore clean technology and
          afforestation levers, and visualize gaps to carbon neutrality—built as a transparent decision
          support layer for operators.
        </p>
        <div className="hero-actions">
          <Link to="/activity/create" className="btn btn--hero">
            Log activity data
          </Link>
          <Link to="/pathways" className="btn btn--hero-secondary">
            Simulate pathways
          </Link>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Snapshot">
        <article className="kpi-card">
          <h3 className="kpi-card__label">Reporting window</h3>
          <p className="kpi-card__value">{loading ? '…' : annualPack.recordCount}</p>
          <p className="kpi-card__hint">Activity records {filterId ? `for mine “${filterId}”` : '(all mines)'}</p>
        </article>
        <article className="kpi-card kpi-card--accent">
          <h3 className="kpi-card__label">Period CO₂e (sum)</h3>
          <p className="kpi-card__value">
            {loading ? '…' : annualPack.periodTotal.toFixed(2)}{' '}
            <span className="kpi-card__unit">t</span>
          </p>
          <p className="kpi-card__hint">From equipment, grid, blasting & methane model</p>
        </article>
        <article className="kpi-card">
          <h3 className="kpi-card__label">Illustrative annual</h3>
          <p className="kpi-card__value">
            {loading ? '…' : annualPack.annual.toFixed(1)}{' '}
            <span className="kpi-card__unit">t CO₂e/yr</span>
          </p>
          <p className="kpi-card__hint">If each row ≈ one reporting day</p>
        </article>
        <article className="kpi-card">
          <h3 className="kpi-card__label">Per-capita (annual)</h3>
          <p className="kpi-card__value">
            {loading || pc == null ? '…' : pc.toFixed(2)}{' '}
            <span className="kpi-card__unit">t / person</span>
          </p>
          <p className="kpi-card__hint">Headcount: {profile.headcount || '—'} · {mineType} mode</p>
        </article>
      </section>

      {error && <p className="feedback feedback--error">{error}</p>}

      <section className="module-grid" aria-labelledby="modules-heading">
        <h2 id="modules-heading" className="sr-only">
          Application modules
        </h2>
        <Link to="/emissions" className="module-card">
          <span className="module-card__icon" aria-hidden>
            ◎
          </span>
          <h3 className="module-card__title">Emission estimation</h3>
          <p className="module-card__text">
            Activity-wise tCO₂e from fuels, electricity, explosives & methane using scalable mine-type
            tuning.
          </p>
        </Link>
        <Link to="/pathways" className="module-card">
          <span className="module-card__icon" aria-hidden>
            ➤
          </span>
          <h3 className="module-card__title">Neutrality pathways</h3>
          <p className="module-card__text">
            EV & clean tech, methane capture, renewables, afforestation area, and carbon credit
            indicators.
          </p>
        </Link>
        <Link to="/insights" className="module-card">
          <span className="module-card__icon" aria-hidden>
            📊
          </span>
          <h3 className="module-card__title">Data visualization</h3>
          <p className="module-card__text">
            Breakdowns, time trend, and gap-to-neutrality charts for your stored activity data.
          </p>
        </Link>
        <Link to="/settings" className="module-card module-card--muted">
          <span className="module-card__icon" aria-hidden>
            ⚙
          </span>
          <h3 className="module-card__title">Mine profile</h3>
          <p className="module-card__text">
            Open-cast / underground / mixed, state for forest offsets, workforce for per-capita metrics.
          </p>
        </Link>
      </section>
    </div>
  )
}
