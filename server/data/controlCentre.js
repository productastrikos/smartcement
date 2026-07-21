// Multi-plant registry for the Smart Control Centre module. CemPulse Demo
// Plant is the home plant (backed by the rest of the app's simulation);
// the others are simulated peer sites for the cross-plant benchmarking view
// described in the reference doc (CEMEX-style multi-plant control centre).

const PLANTS = [
  { id: 'cempulse-demo', name: 'CemPulse Demo Plant', isHome: true },
  { id: 'plant-alpha', name: 'Plant Alpha — North' },
  { id: 'plant-beta', name: 'Plant Beta — Coastal' },
  { id: 'plant-gamma', name: 'Plant Gamma — Highlands' },
  { id: 'plant-delta', name: 'Plant Delta — Riverside' },
  { id: 'plant-epsilon', name: 'Plant Epsilon — Desert' },
];

const DEVIATION_CATEGORIES = ['safety', 'environment', 'efficiency', 'quality'];

function seedPlantMetrics() {
  return {
    availabilityPct: 90 + Math.random() * 6,
    mtbfHours: 420 + Math.random() * 120,
    maintenanceCostReductionPct: 4 + Math.random() * 4,
    uptimePct: 96 + Math.random() * 3,
    oeePct: 78 + Math.random() * 10,
    maintenanceCostUsdPerTon: 3.2 + Math.random() * 1.4,
    timeToCorrectiveActionMin: 25 + Math.random() * 20,
  };
}

const state = {
  plants: Object.fromEntries(PLANTS.map((p) => [p.id, seedPlantMetrics()])),
};

module.exports = { PLANTS, DEVIATION_CATEGORIES, state, seedPlantMetrics };
