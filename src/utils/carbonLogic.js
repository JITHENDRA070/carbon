// Emission factors based on standard carbon accounting logic
export const EMISSION_FACTORS = {
  DIESEL: 2.68, // kg CO2e per liter
  PETROL: 2.31, // kg CO2e per liter
  ELECTRICITY: 0.82, // kg CO2e per kWh (India Grid Avg)
  METHANE_GWP: 28, // 1 kg CH4 = 28 kg CO2e (GWP-100)
  EXPLOSIVES: 0.17 // kg CO2e per kg
};

export const SINK_FACTORS = {
  TREE_ABSORPTION_DAILY: 21 / 365, // ~21kg per year per tree -> daily
  HECTARE_ABSORPTION_DAILY: 10000 / 365 // ~10,000kg per year per hectare -> daily
};

/**
 * Calculates total emissions from raw input
 */
export function calculateEmissions(data) {
  const diesel = (data.dieselLiters || 0) * EMISSION_FACTORS.DIESEL;
  const petrol = (data.petrolLiters || 0) * EMISSION_FACTORS.PETROL;
  const electricity = (data.electricityKwh || 0) * EMISSION_FACTORS.ELECTRICITY;
  const methane = (data.methaneKg || 0) * EMISSION_FACTORS.METHANE_GWP;
  const explosives = (data.explosivesKg || 0) * EMISSION_FACTORS.EXPLOSIVES;

  const totalEmissions = diesel + petrol + electricity + methane + explosives;
  const perCapita = data.workersCount ? totalEmissions / data.workersCount : totalEmissions;

  return {
    breakdown: { diesel, petrol, electricity, methane, explosives },
    totalEmissions,
    perCapita
  };
}

/**
 * Calculates daily carbon sinks
 */
export function calculateSinks(sinks) {
  const trees = (sinks.treesPlanted || 0) * SINK_FACTORS.TREE_ABSORPTION_DAILY;
  const area = (sinks.areaHectares || 0) * SINK_FACTORS.HECTARE_ABSORPTION_DAILY;

  return trees + area; // total kg CO2 absorbed per day
}

export function calculateGapAnalysis(emissions, sinks) {
  const gap = emissions - sinks;
  const creditsEarned = gap < 0 ? Math.abs(gap) / 1000 : 0;
  return { gap, creditsEarned };
}
