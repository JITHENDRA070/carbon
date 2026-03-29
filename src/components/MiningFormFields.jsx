export default function MiningFormFields({ form, onChange, mineIdDisabled }) {
  return (
    <>
      <div className="field">
        <label htmlFor="mineid">Mine ID</label>
        <input
          id="mineid"
          name="mineid"
          type="text"
          autoComplete="off"
          placeholder="Identifies the mine (one entry per mine per day)"
          value={form.mineid}
          disabled={mineIdDisabled}
          onChange={(e) => onChange('mineid', e.target.value)}
        />
      </div>

      <div className="grid">
        <div className="field">
          <label htmlFor="diesel">Diesel</label>
          <input
            id="diesel"
            name="diesel"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={form.diesel}
            onChange={(e) => onChange('diesel', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="petrol">Petrol</label>
          <input
            id="petrol"
            name="petrol"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={form.petrol}
            onChange={(e) => onChange('petrol', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="electricity">Electricity</label>
          <input
            id="electricity"
            name="electricity"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={form.electricity}
            onChange={(e) => onChange('electricity', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="explosives">Explosives</label>
          <input
            id="explosives"
            name="explosives"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={form.explosives}
            onChange={(e) => onChange('explosives', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="methane">Methane</label>
          <input
            id="methane"
            name="methane"
            type="number"
            inputMode="decimal"
            step="any"
            min="0"
            placeholder="0"
            value={form.methane}
            onChange={(e) => onChange('methane', e.target.value)}
          />
        </div>
      </div>
    </>
  )
}
