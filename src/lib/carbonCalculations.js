import {
  DIESEL_TCO2_PER_L,
  PETROL_TCO2_PER_L,
  GRID_ELECTRICITY_TCO2_PER_MWH,
  EXPLOSIVES_TCO2_PER_KG,
  CH4_GWP100,
  MINE_TYPE_TUNING,
  getSequestrationRate,
} from './emissionFactors'

/**
 * @param {object} row — mining activity row (diesel L, petrol L, electricity kWh, explosives kg, methane tCH₄)
 * @param {object} [opts]
 * @param {'opencast'|'underground'|'mixed'} [opts.mineType]
 * @param {number} [opts.gridFactorPerMwh] — override grid tCO₂/MWh
 */
export function emissionBreakdownFromRow(row, opts = {}) {
  const mineType = opts.mineType ?? 'opencast'
  const tune = MINE_TYPE_TUNING[mineType] ?? MINE_TYPE_TUNING.opencast
  const gridFactor = Number(opts.gridFactorPerMwh)
  const gridIntensity = Number.isFinite(gridFactor) ? gridFactor : GRID_ELECTRICITY_TCO2_PER_MWH

  const dieselL = Number(row.diesel) || 0
  const petrolL = Number(row.petrol) || 0
  const electricityKwh = Number(row.electricity) || 0
  const explosivesKg = Number(row.explosives) || 0
  const methaneT = Number(row.methane) || 0

  const diesel = dieselL * DIESEL_TCO2_PER_L * tune.dieselMultiplier
  const petrol = petrolL * PETROL_TCO2_PER_L
  const electricity = (electricityKwh / 1000) * gridIntensity
  const explosives = explosivesKg * EXPLOSIVES_TCO2_PER_KG
  const methane = methaneT * CH4_GWP100 * tune.methaneMultiplier

  const total = diesel + petrol + electricity + explosives + methane

  return {
    diesel,
    petrol,
    electricity,
    explosives,
    methane,
    total,
    labels: {
      diesel: 'Diesel (mobile & aux)',
      petrol: 'Petrol',
      electricity: 'Grid electricity',
      explosives: 'Explosives / blasting',
      methane: 'Methane (ventilation / fugitive)',
    },
  }
}

export function aggregateEmissions(records, mineType, gridFactorPerMwh) {
  const opts = { mineType, gridFactorPerMwh }
  const breakdowns = records.map((r) => emissionBreakdownFromRow(r, opts))
  const sum = { diesel: 0, petrol: 0, electricity: 0, explosives: 0, methane: 0, total: 0 }
  for (const b of breakdowns) {
    sum.diesel += b.diesel
    sum.petrol += b.petrol
    sum.electricity += b.electricity
    sum.explosives += b.explosives
    sum.methane += b.methane
    sum.total += b.total
  }
  return { breakdowns, sum, recordCount: records.length }
}

/**
 * Extrapolate annual tCO₂e assuming each stored row ≈ one reporting day for that mine.
 */
export function annualEstimateFromRecords(records, mineType, gridFactorPerMwh) {
  const { sum, recordCount } = aggregateEmissions(records, mineType, gridFactorPerMwh)
  if (recordCount === 0) return { annual: 0, dailyAvg: 0, recordCount: 0 }
  const dailyAvg = sum.total / recordCount
  const annual = dailyAvg * 365
  return { annual, dailyAvg, periodTotal: sum.total, recordCount }
}

export function perCapitaAnnual(annualTCO2, headcount) {
  const n = Number(headcount) || 0
  if (n <= 0) return null
  return annualTCO2 / n
}

/**
 * Apply pathway levers to baseline annual tCO₂e (multiplicative on relevant shares).
 * shares: fraction of baseline from each source (0–1), sum should ~1
 */
export function applyPathways(baselineAnnual, sourceShares, levers) {
  const { dieselPct, petrolPct, elecPct, explosivesPct, methanePct } = sourceShares
  const ev = Math.min(100, Math.max(0, levers.evDieselReductionPct ?? 0)) / 100
  const methaneCap = Math.min(100, Math.max(0, levers.methaneCapturePct ?? 0)) / 100
  const greenElec = Math.min(100, Math.max(0, levers.greenElectricityPct ?? 0)) / 100
  const renewablesOther = Math.min(100, Math.max(0, levers.otherRenewablesPct ?? 0)) / 100

  const dieselAfter = baselineAnnual * dieselPct * (1 - ev)
  const petrolAfter = baselineAnnual * petrolPct * (1 - ev * 0.5)
  const elecAfter =
    baselineAnnual * elecPct * (1 - greenElec) * (1 - renewablesOther * 0.3)
  const expAfter = baselineAnnual * explosivesPct * (1 - (levers.cleanerBlastingPct ?? 0) / 100)
  const methAfter = baselineAnnual * methanePct * (1 - methaneCap)

  const projected = dieselAfter + petrolAfter + elecAfter + expAfter + methAfter
  const reduced = baselineAnnual - projected

  return {
    projected,
    reduced,
    dieselAfter,
    petrolAfter,
    elecAfter,
    expAfter,
    methAfter,
  }
}

export function afforestationLandHa(remainingTCO2yr, stateKey) {
  const rate = getSequestrationRate(stateKey)
  if (rate <= 0 || remainingTCO2yr <= 0) return 0
  return remainingTCO2yr / rate
}

export function carbonCreditValueInr(tonnesCO2e, inrPerTonne) {
  const price = Number(inrPerTonne) || 0
  return Math.max(0, tonnesCO2e) * price
}

/** @param {{ gridFactorOverride?: string }} profile */
export function resolveGridFactorFromProfile(profile) {
  const raw = profile?.gridFactorOverride
  if (raw === '' || raw == null) return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function sourceSharesFromSum(sumTotal, sumParts) {
  const t = sumTotal || 1e-9
  const dieselPct = sumParts.diesel / t
  const petrolPct = sumParts.petrol / t
  const elecPct = sumParts.electricity / t
  const explosivesPct = sumParts.explosives / t
  const methanePct = sumParts.methane / t
  return { dieselPct, petrolPct, elecPct, explosivesPct, methanePct }
}
