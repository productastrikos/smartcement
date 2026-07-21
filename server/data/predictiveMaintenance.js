const ASSETS = [
  { id: 'AST-KD-1', type: 'Kiln Drive', name: 'Kiln Drive Motor' },
  { id: 'AST-MG-1', type: 'Mill Gearbox', name: 'Raw Mill Gearbox' },
  { id: 'AST-MG-2', type: 'Mill Gearbox', name: 'Cement Mill Gearbox' },
  { id: 'AST-FN-1', type: 'ID Fan', name: 'Kiln ID Fan' },
  { id: 'AST-FN-2', type: 'Cooler Fan', name: 'Clinker Cooler Fan' },
  { id: 'AST-FN-3', type: 'Raw Mill Fan', name: 'Raw Mill Exhaust Fan' },
];

const ISSUE_TYPES = ['bearing_wear', 'misalignment', 'overheating', 'lubrication_loss'];

const now = new Date().toISOString();

function seedAssetState() {
  return {
    vibrationMmS: 2 + Math.random() * 1.5,
    temperatureC: 55 + Math.random() * 10,
    healthScore: 82 + Math.random() * 14,
    lastMaintenanceAt: new Date(Date.now() - (10 + Math.random() * 60) * 86400000).toISOString(),
  };
}

const state = {
  assets: Object.fromEntries(ASSETS.map((a) => [a.id, seedAssetState()])),
  metrics: {
    predictionAccuracyPct: 92 + Math.random() * 4,
  },
};

function deriveBaselineStatus(healthScore) {
  if (healthScore < 40) return 'critical';
  if (healthScore < 60) return 'warning';
  if (healthScore < 80) return 'watch';
  return 'normal';
}

function rulDaysFromHealth(healthScore) {
  return Math.round(Math.max(1, (healthScore / 100) * 240));
}

module.exports = { ASSETS, ISSUE_TYPES, state, deriveBaselineStatus, rulDaysFromHealth, now };
