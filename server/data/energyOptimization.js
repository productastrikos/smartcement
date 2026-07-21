// Static kiln-position baseline thermal profile — a typical rotary kiln rises
// from the feed end through the calcining/transition zone to a peak in the
// burning zone, then drops toward the discharge/nose end.
const KILN_POSITIONS_M = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const BASELINE_PROFILE_C = [780, 900, 1040, 1160, 1280, 1380, 1440, 1450, 1420, 1340, 1220, 1080, 950];

const FUEL_TYPES = ['Coal', 'Petcoke', 'Alternative Fuel (RDF)', 'Biomass'];

const state = {
  metrics: {
    specificPowerKwhPerTon: 68 + Math.random() * 8,
    specificThermalKcalPerKg: 730 + Math.random() * 40,
    altFuelSubstitutionPct: 18 + Math.random() * 8,
    throughputTonsPerHr: 195 + Math.random() * 20,
    energySavingsPct: 9 + Math.random() * 4,
    thermalStabilityScore: 88 + Math.random() * 8,
  },
  kilnProfile: KILN_POSITIONS_M.map((positionM, i) => ({
    positionM,
    temperatureC: BASELINE_PROFILE_C[i] + (Math.random() - 0.5) * 15,
  })),
  fuelMix: {
    Coal: 48,
    Petcoke: 22,
    'Alternative Fuel (RDF)': 20,
    Biomass: 10,
  },
};

module.exports = { KILN_POSITIONS_M, BASELINE_PROFILE_C, FUEL_TYPES, state };
