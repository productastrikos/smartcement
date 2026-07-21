// Registry + in-memory health state for the 7 modules that don't have their
// own sensor fleet (Bag Filter Dust Monitoring manages its own state in
// data/bagfilter.js, derived from real per-compartment readings).

const SIMULATED_MODULES = [
  { id: 'smart-control-centre', label: 'Smart Control Centre Management' },
  { id: '3d-stock-management', label: '3D Stock Management' },
  { id: 'predictive-maintenance', label: 'Predictive Maintenance' },
  { id: 'kiln-energy-optimization', label: 'Kiln and Energy Optimization' },
  { id: 'quality-prediction-lab-automation', label: 'Quality Prediction and Lab Automation' },
  { id: 'worker-safety-computer-vision', label: 'Worker Safety and Computer Vision' },
  { id: 'emissions-carbon-tracking', label: 'Emissions and Carbon Tracking' },
];

function deriveModuleStatus(healthScore) {
  if (healthScore < 40) return 'critical';
  if (healthScore < 60) return 'warning';
  if (healthScore < 80) return 'watch';
  return 'normal';
}

const moduleState = {};
SIMULATED_MODULES.forEach((m) => {
  moduleState[m.id] = {
    healthScore: 82 + Math.random() * 12,
    status: 'normal',
    updatedAt: new Date().toISOString(),
  };
});

module.exports = { SIMULATED_MODULES, moduleState, deriveModuleStatus };
