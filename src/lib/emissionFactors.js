/**
 * Illustrative emission factors for modelling (tCO₂e unless noted).
 * Replace with IPCC / MoEFCC / mine-specific factors for compliance use.
 */

/** Diesel: tCO₂ per litre (liquid fuel combustion, approx.) */
export const DIESEL_TCO2_PER_L = 0.00268

/** Petrol: tCO₂ per litre */
export const PETROL_TCO2_PER_L = 0.00231

/** Grid electricity — India average grid intensity (tCO₂ per MWh), order of magnitude */
export const GRID_ELECTRICITY_TCO2_PER_MWH = 0.713

/** Explosives: tCO₂e per kg (blasting agents, cradle-to-use illustrative) */
export const EXPLOSIVES_TCO2_PER_KG = 0.0032

/** CH₄ to CO₂e using GWP₁₀₀ (AR5-style) */
export const CH4_GWP100 = 28

/**
 * State-wise indicative forest carbon sequestration (tCO₂ absorbed per ha per year).
 * For afforestation offset pathway — illustrative; use state forest department norms for projects.
 */
export const STATE_SEQUESTRATION_TCO2_PER_HA_YR = {
  default: 6.0,
  JH: 5.6,
  WB: 6.1,
  OD: 6.9,
  CG: 6.2,
  MP: 6.4,
  MH: 5.9,
  AP: 6.3,
  TN: 6.5,
  GJ: 5.4,
  RJ: 4.8,
  UP: 5.5,
  BR: 5.7,
  KA: 6.6,
}

export const MINE_TYPE_TUNING = {
  opencast: { dieselMultiplier: 1.12, methaneMultiplier: 1.0 },
  underground: { dieselMultiplier: 0.95, methaneMultiplier: 1.35 },
  mixed: { dieselMultiplier: 1.05, methaneMultiplier: 1.18 },
}

export function getSequestrationRate(stateKey) {
  if (!stateKey) return STATE_SEQUESTRATION_TCO2_PER_HA_YR.default
  const key = stateKey === 'OR' ? 'OD' : stateKey
  return STATE_SEQUESTRATION_TCO2_PER_HA_YR[key] ?? STATE_SEQUESTRATION_TCO2_PER_HA_YR.default
}
