import './DisclaimerStrip.css'

export default function DisclaimerStrip() {
  return (
    <aside className="disclaimer" role="note">
      <strong>Modelling disclaimer:</strong> Emission factors, sequestration rates, and carbon credit
      prices are <em>illustrative</em> defaults for decision support—not statutory reporting. Calibrate
      with IPCC / MoEFCC / mine-specific studies and prevailing market data before compliance or
      investment use.
    </aside>
  )
}
