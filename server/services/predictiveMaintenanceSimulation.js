const { ASSETS, ISSUE_TYPES, state, deriveBaselineStatus } = require('../data/predictiveMaintenance');
const { addAlert, hasActiveAlertForAsset } = require('../data/alertsStore');
const { insertPlantMetric } = require('../db/pg-index');

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

const ISSUE_LABELS = {
  bearing_wear: 'bearing wear',
  misalignment: 'shaft misalignment',
  overheating: 'overheating',
  lubrication_loss: 'lubrication loss',
};

async function tick() {
  const now = new Date().toISOString();

  state.metrics.predictionAccuracyPct = randomWalk(state.metrics.predictionAccuracyPct, 0.4, 88, 98);

  for (const asset of ASSETS) {
    const s = state.assets[asset.id];
    const driftBias = Math.random() < 0.04 ? Math.random() * 2.5 : 0;

    s.vibrationMmS = randomWalk(s.vibrationMmS + driftBias * 0.5, 0.3, 1, 9);
    s.temperatureC = randomWalk(s.temperatureC + driftBias * 2, 1.5, 45, 95);
    s.healthScore = randomWalk(s.healthScore - driftBias * 3, 2, 15, 100);

    const prevStatus = deriveBaselineStatus(s.healthScore + driftBias * 3);
    const status = deriveBaselineStatus(s.healthScore);

    await insertPlantMetric(`asset_vibration_${asset.id}`, now, Number(s.vibrationMmS.toFixed(2)));
    await insertPlantMetric(`asset_temp_${asset.id}`, now, Number(s.temperatureC.toFixed(1)));

    if (status !== prevStatus && (status === 'warning' || status === 'critical')) {
      if (!(await hasActiveAlertForAsset(asset.id, 'predictive-maintenance'))) {
        const issue = ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)];
        await addAlert({
          type: status === 'critical' ? 'critical' : 'warning',
          category: 'predictive-maintenance',
          subtype: issue,
          title: `${asset.name} — asset drift detected (${ISSUE_LABELS[issue]})`,
          message: `Vibration ${s.vibrationMmS.toFixed(1)} mm/s, temperature ${s.temperatureC.toFixed(0)}°C, health score ${Math.round(s.healthScore)}/100. Predicted issue: ${ISSUE_LABELS[issue]}.`,
          zone: asset.type,
          assetId: asset.id,
        });
      }
    }

    if (status === 'warning' || status === 'critical') {
      s.healthScore = randomWalk(s.healthScore + 1.5, 2, 15, 100);
    }
  }
}

function startPredictiveMaintenanceSimulationLoop(intervalMs = 8000) {
  tick().catch((err) => console.error('Predictive maintenance simulation tick failed', err));
  return setInterval(() => {
    tick().catch((err) => console.error('Predictive maintenance simulation tick failed', err));
  }, intervalMs);
}

module.exports = { startPredictiveMaintenanceSimulationLoop, tick };
