import { useMineProfile } from '../context/MineProfileContext'
import { STATE_SEQUESTRATION_TCO2_PER_HA_YR } from '../lib/emissionFactors'
import '../App.css'
import './pages-theme.css'

const STATES = Object.keys(STATE_SEQUESTRATION_TCO2_PER_HA_YR).filter((k) => k !== 'default')

export default function MineSettings() {
  const { profile, updateProfile, hydrated } = useMineProfile()

  if (!hydrated) return <p className="page muted">Loading profile…</p>

  return (
    <div className="page page--wide">
      <header className="header">
        <h1>Mine profile & scale</h1>
        <p className="subtitle">
            Drives mine-type emission tuning (open-cast vs underground methane exposure), per-capita
            denominators, and state-specific afforestation sequestration in pathways.
        </p>
      </header>

      <div className="panel">
        <h2 className="panel__title">Identity & workforce</h2>
        <div className="field">
          <label htmlFor="mineName">Mine / unit name</label>
          <input
            id="mineName"
            value={profile.mineName}
            onChange={(e) => updateProfile({ mineName: e.target.value })}
            placeholder="e.g. Block B — Central Coalfields"
          />
        </div>
        <div className="field">
          <label htmlFor="mineId">Default mine ID (filters analytics)</label>
          <input
            id="mineId"
            value={profile.mineId}
            onChange={(e) => updateProfile({ mineId: e.target.value })}
            placeholder="Must match mineid in activity records"
          />
        </div>
        <div className="field">
          <label htmlFor="headcount">Workforce (for per-capita tCO₂e)</label>
          <input
            id="headcount"
            type="number"
            min={1}
            value={profile.headcount}
            onChange={(e) => updateProfile({ headcount: Number(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Mine classification</h2>
        <div className="field">
          <label htmlFor="mineType">Mine type</label>
          <select
            id="mineType"
            value={profile.mineType}
            onChange={(e) => updateProfile({ mineType: e.target.value })}
          >
            <option value="opencast">Open-cast</option>
            <option value="underground">Underground</option>
            <option value="mixed">Mixed / concurrent</option>
          </select>
        </div>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          Open-cast applies higher diesel intensity; underground elevates modelled fugitive methane
          weighting—scalable for different mine sizes.
        </p>
      </div>

      <div className="panel">
        <h2 className="panel__title">Region & market assumptions</h2>
        <div className="field">
          <label htmlFor="state">State (afforestation sequestration)</label>
          <select
            id="state"
            value={profile.state}
            onChange={(e) => updateProfile({ state: e.target.value })}
          >
            {STATES.sort().map((code) => (
              <option key={code} value={code}>
                {code} (~{STATE_SEQUESTRATION_TCO2_PER_HA_YR[code]} tCO₂/ha·yr illustrative)
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gridFactor">Grid tCO₂/MWh override (optional)</label>
          <input
            id="gridFactor"
            type="number"
            step="0.01"
            placeholder={`Default ${0.713}`}
            value={profile.gridFactorOverride}
            onChange={(e) => updateProfile({ gridFactorOverride: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="credit">Carbon credit reference (₹ / tCO₂e)</label>
          <input
            id="credit"
            type="number"
            min={0}
            step="10"
            value={profile.carbonCreditInrPerTonne}
            onChange={(e) =>
              updateProfile({ carbonCreditInrPerTonne: Number(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <p className="feedback feedback--ok">Profile saves automatically in this browser.</p>
    </div>
  )
}
