const { ASSETS, ISSUE_TYPES, state, deriveBaselineStatus } = require('../data/predictiveMaintenance');
const { addAlert, hasActiveAlertForAsset } = require('../data/alertsStore');
const { insertPlantMetric } = require('../db/pg-index');
const { resolveActiveAlertsForAsset } = require('./bagfilterMaintenance');

function randomWalk(value, step, min, max) {
  const next = value + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, next));
}

// Mean-reverting walk: pulls the value back toward `target` each tick (so a
// spike fades out over the following ticks) instead of a plain bounded
// random walk, which would eventually diffuse evenly across the whole
// [min, max] range and leave assets permanently drifted out of their normal
// operating band.
function meanRevert(value, target, step, pull, min, max) {
  const reverted = value + (target - value) * pull + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, reverted));
}

const VIBRATION_TARGET_MM_S = 3; // normal band: 2-4 mm/s
const TEMPERATURE_TARGET_C = 62.5; // normal band: 55-70°C

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
    // Occasional spike event (~4% of ticks) pushes vibration/temperature
    // above the anomaly threshold; mean reversion fades it back out over
    // the following ticks rather than leaving it permanently elevated.
    const spikeEvent = Math.random() < 0.04;
    const vibSpike = spikeEvent ? 3 + Math.random() * 3 : 0; // +3 to +6 mm/s
    const tempSpike = spikeEvent ? 15 + Math.random() * 20 : 0; // +15 to +35°C
    const driftBias = spikeEvent ? 1 : 0;

    s.vibrationMmS = meanRevert(s.vibrationMmS + vibSpike, VIBRATION_TARGET_MM_S, 0.3, 0.18, 1, 9);
    s.temperatureC = meanRevert(s.temperatureC + tempSpike, TEMPERATURE_TARGET_C, 1.5, 0.18, 45, 95);
    s.healthScore = randomWalk(s.healthScore - driftBias * 3, 2, 15, 100);

    const prevStatus = deriveBaselineStatus(s.healthScore + driftBias * 3, s.vibrationMmS, s.temperatureC);
    const status = deriveBaselineStatus(s.healthScore, s.vibrationMmS, s.temperatureC);

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
    } else if (status === 'normal' && prevStatus !== 'normal') {
      await resolveActiveAlertsForAsset(asset.id, 'predictive-maintenance');
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
